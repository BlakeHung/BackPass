import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activityId, groupMemberId, amount } = await req.json();

    // 檢查活動和群組成員是否存在
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        groups: {
          include: {
            members: {
              where: { id: groupMemberId },
            },
          },
        },
      },
    });

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // 更新或創建結算記錄
    const settlement = await prisma.activitySettlement.upsert({
      where: {
        activityId_groupMemberId: {
          activityId,
          groupMemberId,
        },
      },
      update: {
        paidAmount: {
          increment: amount,
        },
        balance: {
          decrement: amount,
        },
      },
      create: {
        activityId,
        groupMemberId,
        shouldPay: 0, // 這個值應該從活動總支出計算
        paidAmount: amount,
        balance: -amount, // 初始值為負數，表示待付金額
      },
    });

    return NextResponse.json(settlement);
  } catch (error) {
    console.error('Error recording payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 