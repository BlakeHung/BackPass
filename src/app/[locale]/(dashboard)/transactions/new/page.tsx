import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TransactionForm } from "@/components/TransactionForm";
import { getTranslations } from 'next-intl/server';

type PageProps = {
  searchParams: Promise<{ type: 'EXPENSE' | 'INCOME' }>;
};

export default async function NewTransactionPage({
  searchParams,
}: PageProps) {
  const t = await getTranslations('transactions');
  const queryParams = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  // 獲取分類列表
  const categories = await prisma.category.findMany({
    where: {
      type: queryParams.type,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // 獲取進行中的活動，包含參與者信息
  const activities = await prisma.activity.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      startDate: 'desc',
    },
    include: {
      groups: {
        include: {
          members: {
            include: {
              groupMember: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      }
    }
  });

  // 格式化活動數據，包含參與者
  const formattedActivities = activities.map(activity => ({
    id: activity.id,
    name: activity.name,
    participants: activity.groups.flatMap(group => 
      group.members.map(member => member.groupMember)
    )
  }));

  const today = new Date();  // 使用 Date 對象
  const latestActivity = formattedActivities[0];
  const canManagePayments = session.user.role === 'ADMIN' || session.user.role === 'FINANCE_MANAGER';

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          {queryParams.type === 'EXPENSE' ? t('new_expense') : t('new_income')}
        </h1>
        <TransactionForm 
          type={queryParams.type} 
          categories={categories.map(cat => ({
            ...cat,
            type: cat.type as 'EXPENSE' | 'INCOME'
          }))}
          activities={formattedActivities}
          defaultValues={{
            amount: 0,
            categoryId: categories[0]?.id || '',
            date: today,
            activityId: latestActivity?.id || 'none',
            payerId: null,
            description: '',
            images: []
          }}
          canManagePayments={canManagePayments}
        />
      </div>
    </div>
  );
} 