import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { EdmForm } from "@/components/EdmForm";
import { getTranslations, setRequestLocale } from 'next-intl/server';

// 動態生成 metadata
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'activities' });
  
  return {
    title: t('edm_management'),
    description: t('edm_management'),
  };
}

type PageProps = {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function EdmPage({
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
    redirect('/activities');
  }

  const activity = await prisma.activity.findUnique({
    where: { id },
    include: {
      edm: true,
    },
  });

  if (!activity) {
    notFound();
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">{t('edm_management')}</h1>
        <div className="mb-4">
          <h2 className="text-lg font-medium mb-2">{activity.name}</h2>
          <p className="text-sm text-gray-500">
            {new Date(activity.startDate).toLocaleDateString()} - {new Date(activity.endDate).toLocaleDateString()}
          </p>
        </div>
        <EdmForm 
          activityId={activity.id}
          defaultValues={activity.edm ? {
            title: activity.edm.title,
            content: activity.edm.content,
            images: activity.edm.images,
            contactInfo: activity.edm.contactInfo || undefined,
            registrationLink: activity.edm.registrationLink || undefined,
          } : undefined}
        />
      </div>
    </div>
  );
} 