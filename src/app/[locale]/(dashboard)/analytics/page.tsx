import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Activity, ArrowDown, ArrowUp } from "lucide-react";
import { TransactionChart } from "@/components/analytics/TransactionChart";
import { ActivityStats } from "@/components/analytics/ActivityStats";
import { CategoryChart } from "@/components/analytics/CategoryChart";
import { MonthlyComparison } from "@/components/analytics/MonthlyComparison";
import { getTranslations } from 'next-intl/server';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function AnalyticsPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('analytics');
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  // 獲取本月日期範圍
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // 獲取本月收支統計
  const monthlyTransactions = await prisma.transaction.findMany({
    where: {
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  // 計算本月收入和支出
  const monthlyStats = monthlyTransactions.reduce(
    (acc, transaction) => {
      if (transaction.type === 'INCOME') {
        acc.income += transaction.amount;
      } else {
        acc.expense += transaction.amount;
      }
      return acc;
    },
    { income: 0, expense: 0 }
  );

  // 獲取待付款金額 (使用 status 字段代替不存在的 paymentStatus)
  const unpaidAmount = await prisma.transaction.aggregate({
    where: {
      status: 'PENDING',
    },
    _sum: {
      amount: true,
    },
  });

  // 獲取活動支出統計
  const activityExpenses = await prisma.transaction.groupBy({
    by: ['activityId'],
    where: {
      activityId: { not: null },
      type: 'EXPENSE',
    },
    _sum: {
      amount: true,
    },
  });

  // 獲取過去30天的收支趨勢數據
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyTransactions = await prisma.transaction.findMany({
    where: {
      date: {
        gte: thirtyDaysAgo,
      },
    },
    select: {
      date: true,
      amount: true,
      type: true,
    },
    orderBy: {
      date: 'asc',
    },
  });

  // 處理圖表數據
  const chartData = dailyTransactions.reduce((acc: Array<{date: string; income: number; expense: number}>, transaction) => {
    const date = transaction.date.toISOString().split('T')[0];
    const existing = acc.find(item => item.date === date);
    
    if (existing) {
      if (transaction.type === 'INCOME') {
        existing.income += transaction.amount;
      } else {
        existing.expense += transaction.amount;
      }
    } else {
      acc.push({
        date,
        income: transaction.type === 'INCOME' ? transaction.amount : 0,
        expense: transaction.type === 'EXPENSE' ? transaction.amount : 0,
      });
    }
    
    return acc;
  }, []);

  // 獲取活動詳細統計 (修正 paymentStatus 為 status)
  const activities = await prisma.activity.findMany({
    where: {
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      transactions: {
        where: {
          type: 'EXPENSE',
        },
        select: {
          amount: true,
          status: true,
        },
      },
    },
  });

  const activityStats = activities.map(activity => ({
    id: activity.id,
    name: activity.name,
    totalExpense: activity.transactions.reduce((sum, t) => sum + t.amount, 0),
    unpaidAmount: activity.transactions
      .filter(t => t.status === 'PENDING')
      .reduce((sum, t) => sum + t.amount, 0),
    transactionCount: activity.transactions.length,
  }));

  // 獲取分類支出統計
  const categoryExpenses = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      type: 'EXPENSE',
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    _sum: {
      amount: true,
    },
  });

  // 獲取分類名稱
  const categories = await prisma.category.findMany({
    where: {
      id: {
        in: categoryExpenses.map(ce => ce.categoryId),
      },
    },
  });

  // 處理分類圖表數據
  const categoryChartData = categoryExpenses.map(ce => ({
    name: categories.find(c => c.id === ce.categoryId)?.name || (locale === 'zh' ? '未分類' : 'Uncategorized'),
    value: ce._sum.amount || 0,
  }));

  // 獲取過去6個月的數據
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

  // 獲取每月的數據
  const monthlyComparisonData = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - i, 1);
    monthStart.setHours(0, 0, 0, 0);
    
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const monthTransactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      select: {
        amount: true,
        type: true,
      },
    });

    const monthlyStats = monthTransactions.reduce(
      (acc, transaction) => {
        if (transaction.type === 'INCOME') {
          acc.income += transaction.amount;
        } else {
          acc.expense += transaction.amount;
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );

    monthlyComparisonData.push({
      month: monthStart.toLocaleString(locale === 'zh' ? 'zh-TW' : 'en-US', { month: 'short' }),
      income: monthlyStats.income,
      expense: monthlyStats.expense,
    });
  }

  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 本月收入 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('this_month')} {t('total_income')}</CardTitle>
            <ArrowUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlyStats.income.toLocaleString()}</div>
          </CardContent>
        </Card>

        {/* 本月支出 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('this_month')} {t('total_expense')}</CardTitle>
            <ArrowDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlyStats.expense.toLocaleString()}</div>
          </CardContent>
        </Card>

        {/* 待付款金額 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('pending_payments')}</CardTitle>
            <CreditCard className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(unpaidAmount._sum.amount || 0).toLocaleString()}</div>
          </CardContent>
        </Card>

        {/* 活動總支出 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('activity_total_expense')}</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${activityExpenses.reduce((sum, activity) => sum + (activity._sum.amount || 0), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 收支趨勢圖 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('income_vs_expense')}</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionChart data={chartData} />
        </CardContent>
      </Card>

      {/* 分類支出分析 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('this_month')} {t('expense_by_category')}</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryChart data={categoryChartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('monthly_trend')}</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyComparison data={monthlyComparisonData} />
          </CardContent>
        </Card>
      </div>

      {/* 活動統計 */}
      <div>
        <h2 className="text-xl font-bold mb-4">{t('activity_stats')}</h2>
        <ActivityStats activities={activityStats} />
      </div>
    </div>
  );
} 