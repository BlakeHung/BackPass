import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TransactionForm } from "@/components/TransactionForm";
import { getTranslations } from 'next-intl/server';

type PageProps = {
  params: { id: string };
};

export default async function EditTransactionPage({
  params: { id },
}: PageProps) {
  const t = await getTranslations('transactions');
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  // 獲取交易記錄
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      category: true,
      activity: {
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
      },
      groupMember: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  if (!transaction) {
    redirect('/transactions');
  }

  // 檢查權限
  const canManagePayments = session.user.role === 'ADMIN' || session.user.role === 'FINANCE_MANAGER';
  if (!canManagePayments) {
    redirect('/transactions');
  }

  // 獲取分類列表
  const categories = await prisma.category.findMany({
    where: {
      type: transaction.type,
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

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          {transaction.type === 'EXPENSE' ? t('edit_expense') : t('edit_income')}
        </h1>
        <TransactionForm 
          type={transaction.type as 'EXPENSE' | 'INCOME'} 
          categories={categories.map(cat => ({
            ...cat,
            type: cat.type as 'EXPENSE' | 'INCOME'
          }))}
          activities={formattedActivities}
          defaultValues={{
            amount: transaction.amount,
            categoryId: transaction.categoryId,
            date: transaction.date,
            activityId: transaction.activityId || 'none',
            payerId: transaction.groupMember?.id || null,
            description: transaction.description || '',
            images: transaction.images || []
          }}
          transactionId={transaction.id}
          canManagePayments={canManagePayments}
        />
      </div>
    </div>
  );
} 