import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { ActivityForm } from "@/components/ActivityForm";
import { getTranslations, setRequestLocale } from 'next-intl/server';

// 動態生成 metadata
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'activities' });
  
  return {
    title: t('edit_activity'),
    description: t('edit_activity'),
  };
}

type PageProps = {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function EditActivityPage({
  params,
  searchParams,
}: PageProps) {
  // 等待 params 解析
  const { id, locale } = await params;
  
  // 設置請求語言，啟用靜態渲染
  setRequestLocale(locale);
  
  // 等待 searchParams 解析
  await searchParams;
  
  const session = await getServerSession(authOptions);
  
  // 獲取翻譯
  const t = await getTranslations({ locale, namespace: 'activities' });
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/transactions');
  }

  // 獲取活動資料，包含群組和成員
  const activity = await prisma.activity.findUnique({
    where: { id },
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
    notFound();
  }

  // 獲取所有可用的群組
  const groups = await prisma.group.findMany({
    include: {
      members: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  
  // 準備表單初始值
  const selectedGroups = activity.groups.map(ag => ag.groupId);
  const groupMembers = activity.groups.flatMap(ag => 
    ag.members.map(m => ({
      groupId: ag.groupId,
      memberId: m.groupMember.id,
      isParticipating: m.isParticipating,
    }))
  );
  return (
    <div className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">{t('edit_activity')}</h1>
        <ActivityForm 
          defaultValues={{
            name: activity.name,
            startDate: activity.startDate,
            endDate: activity.endDate,
            description: activity.description || '',
            enabled: activity.enabled,
            selectedGroups,
            groupMembers,
          }}
          activityId={activity.id}
          groups={groups}
        />
      </div>
    </div>
  );
} 