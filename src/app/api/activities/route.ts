import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// type GroupMember = {
//   groupId: string;
//   memberId: string;
//   isParticipating: boolean;
//   companions?: number;
//   note?: string;
// };

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const data = await request.json();
    console.log("[ACTIVITY_CREATE] Received data:", JSON.stringify(data, null, 2));
    const { name, startDate, endDate, description, enabled, selectedGroups, groupMembers } = data;

    // 創建活動
    const activity = await prisma.activity.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description,
        enabled,
      },
    });

    // 為每個選中的群組創建 ActivityGroup
    const activityGroups = await Promise.all(
      selectedGroups.map(async (groupId: string) => {
        return prisma.activityGroup.create({
          data: {
            activityId: activity.id,
            groupId: groupId,
            memberCount: 0, // 初始值為 0，稍後更新
          },
        });
      })
    );

    // 創建 ActivityGroupMember 記錄
    if (groupMembers && groupMembers.length > 0) {
      await Promise.all(
        groupMembers.map(async (member: { groupId: string; memberId: string; isParticipating: boolean }) => {
          // 找到對應的 ActivityGroup
          const activityGroup = activityGroups.find(ag => ag.groupId === member.groupId);
          if (activityGroup) {
            await prisma.activityGroupMember.create({
              data: {
                activityGroupId: activityGroup.id,
                groupMemberId: member.memberId,
                isParticipating: member.isParticipating,
              },
            });
          }
        })
      );

      // 更新每個 ActivityGroup 的 memberCount
      await Promise.all(
        activityGroups.map(async (ag) => {
          const participatingMembers = await prisma.activityGroupMember.count({
            where: {
              activityGroupId: ag.id,
              isParticipating: true,
            },
          });

          await prisma.activityGroup.update({
            where: { id: ag.id },
            data: { memberCount: participatingMembers },
          });
        })
      );
    }

    return NextResponse.json(activity);
  } catch (error) {
    console.error("[ACTIVITY_CREATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const activities = await prisma.activity.findMany({
      include: {
        groups: {
          include: {
            group: true,
            members: {
              include: {
                groupMember: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error("[ACTIVITIES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 