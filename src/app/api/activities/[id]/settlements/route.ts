import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const activityId = params.id;
    const settlements = await prisma.activitySettlement.findMany({
      where: { activityId },
      include: {
        groupMember: true,
        transactions: {
          where: { isSettlementPayment: true }
        },
        settledByUser: {
          select: { name: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(settlements);
  } catch (error) {
    console.error('Error fetching settlements:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const activityId = params.id;

    // 1. 獲取活動的所有交易
    const transactions = await prisma.transaction.findMany({
      where: { 
        activityId,
        type: 'EXPENSE' // 只計算支出
      },
      include: {
        category: true,
        groupMember: true
      }
    });

    // 2. 獲取活動群組的實際參與成員
    const activityGroupMembers = await prisma.activityGroupMember.findMany({
      where: {
        activityGroup: {
          activityId
        },
        isParticipating: true // 只取實際參與的成員
      },
      include: {
        groupMember: true,
        activityGroup: {
          include: {
            group: true
          }
        }
      }
    });

    if (activityGroupMembers.length === 0) {
      return NextResponse.json(
        { message: '找不到參與的群組成員' },
        { status: 400 }
      );
    }

    // 3. 計算每個參與成員的應付金額
    const settlements = activityGroupMembers.map(agm => {
      const memberTransactions = transactions.filter(
        t => t.groupMemberId === agm.groupMemberId
      );
      
      const shouldPay = memberTransactions.reduce(
        (sum, t) => sum + t.amount,
        0
      );

      return {
        activityId,
        groupMemberId: agm.groupMemberId,
        shouldPay,
        paidAmount: 0,
        balance: shouldPay,
        status: 'PENDING',
        settledBy: session.user.id
      };
    }).filter(settlement => settlement.shouldPay > 0); // 只保留有應付金額的記錄

    if (settlements.length === 0) {
      return NextResponse.json(
        { message: '沒有需要結算的記錄' },
        { status: 400 }
      );
    }

    // 4. 刪除舊的結帳記錄
    await prisma.activitySettlement.deleteMany({
      where: { activityId }
    });

    // 5. 創建新的結帳記錄
    await prisma.activitySettlement.createMany({
      data: settlements
    });

    // 6. 獲取完整的結帳記錄
    const updatedSettlements = await prisma.activitySettlement.findMany({
      where: { activityId },
      include: {
        groupMember: true,
        transactions: {
          where: { isSettlementPayment: true }
        },
        settledByUser: {
          select: { name: true }
        }
      }
    });

    return NextResponse.json(updatedSettlements);
  } catch (error) {
    console.error('Error creating settlements:', error);
    return NextResponse.json(
      { 
        message: error instanceof Error ? error.message : 'Internal Server Error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
