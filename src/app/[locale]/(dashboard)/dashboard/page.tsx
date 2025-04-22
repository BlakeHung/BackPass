import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardContent } from "./DashboardContent";

async function getStats() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [
    activeActivities,
    allActivities,
    recentTransactions,
    categoryStats,
  ] = await Promise.all([
    // 進行中的活動
    prisma.activity.findMany({
      where: {
        enabled: true,
        startDate: { lte: today },
        endDate: { gte: today },
      },
      include: {
        edm: true,
      },
      orderBy: {
        startDate: 'asc',
      },
      take: 5,
    }),
    // 所有活動（按時間排序）
    prisma.activity.findMany({
      where: {
        enabled: true,
      },
      orderBy: {
        startDate: 'desc',
      },
      take: 5,
      include: {
        edm: true,
      },
    }),
    // 取得最近的交易記錄
    prisma.transaction.findMany({
      include: {
        category: true,
        user: true,
        groupMember: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        date: 'desc',
      },
      take: 5,
    }),
    // 取得分類統計
      prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
    }).then(async (stats) => {
      const categories = await prisma.category.findMany({
        where: {
          id: {
            in: stats.map(s => s.categoryId),
          },
        },
      });

      const totalAmount = stats.reduce((sum, stat) => sum + (stat._sum.amount || 0), 0);

      return stats.map(stat => ({
        ...stat,
        category: categories.find(c => c.id === stat.categoryId)!,
        percentage: (stat._sum.amount! / (totalAmount || 1)) * 100,
      })).sort((a, b) => (b._sum.amount || 0) - (a._sum.amount || 0));
    }),
  ]);

  return {
    activeActivities,
    allActivities,
    recentTransactions,
    categoryStats,
  };
}

// 活動狀態判斷函數
function getActivityStatus(startDate: Date, endDate: Date) {
  const now = new Date();
  
  if (now < startDate) {
    return { status: '即將開始', className: 'bg-yellow-100 text-yellow-800' };
  }
  
  if (now > endDate) {
    return { status: '已結束', className: 'bg-gray-100 text-gray-800' };
  }
  
  return { status: '進行中', className: 'bg-green-100 text-green-800' };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  const stats = await getStats();

  return <DashboardContent stats={stats} />;
} 