// src/types/settlement.ts

import { Activity, ActivitySettlement as PrismaActivitySettlement, GroupMember, User } from '@prisma/client';

export interface ActivitySettlement extends PrismaActivitySettlement {
  groupMember: GroupMember;
  settledByUser?: User;
  activity?: Activity;
}

export const SETTLEMENT_STATUS = {
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  OVERPAID: 'OVERPAID'
} as const;

export type SettlementStatus = keyof typeof SETTLEMENT_STATUS;

export function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    ALL: '全部',
    PENDING: '未結算',
    PARTIAL: '部分結算',
    PAID: '已結算',
    OVERPAID: '溢付'
  };
  return statusMap[status] || status;
}

export type SettlementWithRelations = ActivitySettlement & {
  groupMember: {
    id: string;
    name: string;
  };
  transactions: Array<{
    id: string;
    amount: number;
    date: Date;
    description?: string;
  }>;
  settledByUser?: {
    name: string;
  };
};

export type ActivityWithSettlements = {
  id: string;
  name: string;
  settlements: SettlementWithRelations[];
};