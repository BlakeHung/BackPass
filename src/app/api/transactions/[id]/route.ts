import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = await params.id;

    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        activity: true,
      }
    });

    if (!transaction) {
      return new NextResponse("Not found", { status: 404 });
    }

    // 檢查權限
    const isOwner = transaction.userId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await request.json();

    // 如果提供了新的 activityId，檢查該活動是否存在
    if (body.activityId) {
      const activity = await prisma.activity.findUnique({
        where: { id: body.activityId }
      });

      if (!activity) {
        return new NextResponse("Activity not found", { status: 404 });
      }
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        amount: body.amount,
        type: body.type,
        date: new Date(body.date),
        description: body.description,
        activityId: body.activityId,
        status: body.status,
        groupMemberId: body.groupMemberId,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedTransaction);
  } catch (error) {
    console.error("[TRANSACTION_UPDATE]", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Internal error", 
      { status: 500 }
    );
  }
} 