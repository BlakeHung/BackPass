// src/app/[locale]/(dashboard)/settlements/[id]/page.tsx

import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { SettlementDetail } from '@/components/settlement/SettlementDetail';

interface PageProps {
  params: {
    id: string;
  };
}

async function getSettlement(id: string) {
  const settlement = await prisma.activitySettlement.findUnique({
    where: { id },
    include: {
      activity: true,
      groupMember: true,
      transactions: {
        where: {
          isSettlementPayment: true
        },
        orderBy: { date: 'desc' }
      },
      settledByUser: {
        select: { name: true }
      }
    }
  });

  if (!settlement) notFound();
  return settlement;
}

export default async function SettlementDetailPage({ params }: PageProps) {
  const settlement = await getSettlement(params.id);
  
  return <SettlementDetail settlement={settlement} />;
}