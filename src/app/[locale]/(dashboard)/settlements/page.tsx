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

  // 獲取所有活動
  const activities = await prisma.activity.findMany({
    where: {
      status: "ACTIVE",
      enabled: true,
    },
    include: {
      groups: {
        include: {
          members: {
            include: {
              groupMember: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      },
      transactions: {
        include: {
          groupMember: {
            select: {
              id: true,
              name: true,
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          category: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  console.log(activities);
  return <SettlementCenter activities={activities} />;
}
