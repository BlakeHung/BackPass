import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { name, startDate, endDate, description, enabled, selectedGroups, groupMembers } = data;

    // 1. Update basic activity details
    await prisma.activity.update({
      where: {
        id: params.id,
      },
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description: description || "",
        enabled,
        updatedAt: new Date(),
      },
    });

    // 2. Get current groups
    const currentActivityGroups = await prisma.activityGroup.findMany({
      where: { activityId: params.id },
      select: { id: true, groupId: true }
    });
    const currentGroupIds = currentActivityGroups.map(ag => ag.groupId);

    // 3. Determine groups to add and remove
    const groupsToAdd = selectedGroups.filter((groupId: string) => !currentGroupIds.includes(groupId));
    const groupsToRemove = currentActivityGroups.filter(ag => !selectedGroups.includes(ag.groupId));
    const groupsToKeep = currentActivityGroups.filter(ag => selectedGroups.includes(ag.groupId));

    // 4. Remove deselected groups
    if (groupsToRemove.length > 0) {
      await prisma.activityGroup.deleteMany({
        where: { id: { in: groupsToRemove.map(ag => ag.id) } },
      });
    }

    // 5. Add new groups
    const newActivityGroups = await Promise.all(
      groupsToAdd.map(async (groupId: string) => {
        return prisma.activityGroup.create({
          data: {
            activityId: params.id,
            groupId: groupId,
            memberCount: 0,
          },
          select: { id: true, groupId: true }
        });
      })
    );

    // 6. Update members for all groups
    const allActivityGroups = [...groupsToKeep, ...newActivityGroups];
    
    if (groupMembers && groupMembers.length > 0) {
      await Promise.all(
        allActivityGroups.map(async (ag) => {
          const membersForThisGroup = groupMembers.filter(
            (m: { groupId: string }) => m.groupId === ag.groupId
          );

          // Update or create member statuses
          await Promise.all(
            membersForThisGroup.map(async (member: { memberId: string; isParticipating: boolean }) => {
              await prisma.activityGroupMember.upsert({
                where: {
                  activityGroupId_groupMemberId: {
                    activityGroupId: ag.id,
                    groupMemberId: member.memberId,
                  }
                },
                update: {
                  isParticipating: member.isParticipating,
                },
                create: {
                  activityGroupId: ag.id,
                  groupMemberId: member.memberId,
                  isParticipating: member.isParticipating,
                },
              });
            })
          );

          // Update member count
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

    // 7. Return updated activity with all relations
    const updatedActivity = await prisma.activity.findUnique({
      where: { id: params.id },
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
    });

    return NextResponse.json(updatedActivity);
  } catch (error) {
    console.error("[ACTIVITY_UPDATE]", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const activity = await prisma.activity.findUnique({
      where: {
        id: params.id,
      },
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
    });

    if (!activity) {
      return NextResponse.json(
        { error: "Activity not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(activity);
  } catch (error) {
    console.error("[ACTIVITY_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
} 