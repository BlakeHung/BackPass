import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await request.json();
    console.log("Received data:", data);

    // 驗證必要欄位
    if (!data.amount || !data.categoryId || !data.date) {
      return NextResponse.json(
        { error: "Missing required fields", data },
        { status: 400 }
      );
    }

    // 獲取預設活動或第一個活動
    const defaultActivity = await prisma.activity.findFirst({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!defaultActivity) {
      return NextResponse.json(
        { error: "No active activity found" },
        { status: 400 }
      );
    }

    // 確保日期格式正確
    const date = new Date(data.date);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    // 創建新的支出記錄
    const transaction = await prisma.transaction.create({
      data: {
        amount: parseFloat(data.amount),
        type: data.type,
        description: data.description || "",
        date: date,
        categoryId: data.categoryId,
        userId: session.user.id,
        activityId: data.activityId || defaultActivity.id,
        status: "PENDING",
        images: data.images || [],
        groupMemberId: data.groupMemberId || null,
      },
    });

    console.log("Created transaction:", transaction);

    return NextResponse.json({ data: transaction });
    
  } catch (error) {
    console.error("[TRANSACTION_CREATE]", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sortBy = searchParams.get('sortBy') || 'date';
    const order = searchParams.get('order') || 'desc';

    // 檢查是否有權限查看所有記錄
    const canViewAll = session.user.role === 'ADMIN' || session.user.role === 'FINANCE_MANAGER';

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: canViewAll 
          ? userId || undefined
          : session.user.id,
      },
      include: {
        category: true,
        user: true,
        activity: true,
      },
      orderBy: {
        [sortBy]: order,
      },
    });

    return NextResponse.json({ data: transactions });
  } catch (error) {
    console.error("[TRANSACTIONS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
} 