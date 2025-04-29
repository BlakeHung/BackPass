import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { SettlementCenter } from "@/components/settlement/SettlementCenter";
import { redirect } from "next/navigation";

export default async function SettlementsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  // 獲取所有活動的結算記錄
  const settlements = await prisma.activitySettlement.findMany({
    include: {
      activity: true,
      groupMember: true,
      settledByUser: {
        select: { name: true },
      },
      transactions: {
        where: { isSettlementPayment: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return <SettlementCenter settlements={settlements} />;
}
