// src/components/settlement/SettlementCenter.tsx

'use client';

import { useState } from 'react';
import { Activity, ActivityGroup, ActivityGroupMember, Transaction } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ActivityWithGroups extends Activity {
  groups: (ActivityGroup & {
    members: (ActivityGroupMember & {
      groupMember: {
        id: string;
        name: string;
        user: {
          id: string;
          name: string;
        } | null;
      };
    })[];
  })[];
  transactions: (Transaction & {
    groupMember: {
      id: string;
      name: string;
      user: {
        id: string;
        name: string;
      } | null;
    } | null;
  })[];
}

interface SettlementCenterProps {
  activities: ActivityWithGroups[];
}

export function SettlementCenter({ activities }: SettlementCenterProps) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityWithGroups | null>(null);

  // 獲取所有參與者（從所有群組的成員）
  const participants = selectedActivity?.groups.flatMap(group => 
    group.members.map(member => ({
      id: member.groupMember.id,
      name: member.groupMember.user?.name || member.groupMember.name,
    }))
  ) || [];

  // 計算活動總支出
  const totalExpense = selectedActivity?.transactions.reduce((sum, t) => sum + t.amount, 0) || 0;

  // 計算每人應付金額
  const perPersonAmount = participants.length 
    ? totalExpense / participants.length 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">結算中心</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>選擇活動</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedActivity?.id}
            onValueChange={(value) => {
              const activity = activities.find(a => a.id === value);
              setSelectedActivity(activity || null);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="選擇活動" />
            </SelectTrigger>
            <SelectContent>
              {activities.map((activity) => (
                <SelectItem key={activity.id} value={activity.id}>
                  {activity.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedActivity && (
        <Card>
          <CardHeader>
            <CardTitle>結算明細</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p>活動總支出: ${totalExpense.toFixed(2)}</p>
              <p>參與人數: {participants.length}</p>
              <p>每人應付: ${perPersonAmount.toFixed(2)}</p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>參與者</TableHead>
                  <TableHead>應付金額</TableHead>
                  <TableHead>已付金額</TableHead>
                  <TableHead>待付金額</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((participant) => {
                  // 計算該參與者已付金額
                  const paidAmount = selectedActivity.transactions
                    .filter(t => t.groupMember?.id === participant.id)
                    .reduce((sum, t) => sum + t.amount, 0);

                  const balance = perPersonAmount - paidAmount;

                  return (
                    <TableRow key={participant.id}>
                      <TableCell>{participant.name}</TableCell>
                      <TableCell>${perPersonAmount.toFixed(2)}</TableCell>
                      <TableCell>${paidAmount.toFixed(2)}</TableCell>
                      <TableCell>${balance.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}