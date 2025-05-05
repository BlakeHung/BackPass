// src/components/settlement/SettlementCenter.tsx

'use client';

import { useState, Fragment } from 'react';
import { Activity, ActivityGroup, ActivityGroupMember, Transaction, Category } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight } from 'lucide-react';

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
    category: Category;
  })[];
  settlements: {
    id: string;
    shouldPay: number;
    paidAmount: number;
    balance: number;
    groupMemberId: string;
  }[];
}

interface SettlementCenterProps {
  activities: ActivityWithGroups[];
}

export function SettlementCenter({ activities }: SettlementCenterProps) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityWithGroups | null>(null);
  const [expandedParticipants, setExpandedParticipants] = useState<Set<string>>(new Set());
  const [paymentAmount, setPaymentAmount] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<{ [key: string]: boolean }>({});

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

  // 計算每個參與者的已付金額（支付 - 收入）
  const calculatePaidAmount = (participantId: string) => {
    if (!selectedActivity) return 0;
    
    const payments = selectedActivity.transactions
      .filter(t => t.groupMember?.id === participantId && t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const incomes = selectedActivity.transactions
      .filter(t => t.groupMember?.id === participantId && t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    return payments - incomes;
  };

  const toggleParticipant = (participantId: string) => {
    const newExpanded = new Set(expandedParticipants);
    if (newExpanded.has(participantId)) {
      newExpanded.delete(participantId);
    } else {
      newExpanded.add(participantId);
    }
    setExpandedParticipants(newExpanded);
  };

  const handlePayment = async (participantId: string, isRefund: boolean = false) => {
    if (!selectedActivity) return;
    
    const amount = parseFloat(paymentAmount[participantId]);
    if (isNaN(amount) || amount <= 0) {
      alert('請輸入有效的金額');
      return;
    }

    setIsSubmitting(prev => ({ ...prev, [participantId]: true }));

    try {
      const response = await fetch('/api/settlements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityId: selectedActivity.id,
          groupMemberId: participantId,
          amount: isRefund ? -amount : amount, // 如果是退款，使用負數金額
        }),
      });

      if (!response.ok) {
        throw new Error('操作失敗');
      }

      // 更新本地狀態
      const updatedSettlement = await response.json();
      setSelectedActivity(prev => {
        if (!prev) return null;
        return {
          ...prev,
          settlements: prev.settlements.map(s => 
            s.groupMemberId === participantId ? updatedSettlement : s
          ),
        };
      });

      // 清空輸入框
      setPaymentAmount(prev => ({ ...prev, [participantId]: '' }));
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('操作失敗，請重試');
    } finally {
      setIsSubmitting(prev => ({ ...prev, [participantId]: false }));
    }
  };

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
              setExpandedParticipants(new Set());
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
        <>
          <Card>
            <CardHeader>
              <CardTitle>活動帳款總結</CardTitle>
            </CardHeader>
            <CardContent>
              {/* 桌機三欄，手機卡片式 */}
              <div className="hidden sm:grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">總支出</p>
                  <p className="text-2xl font-bold">${totalExpense.toFixed(2)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">總收入</p>
                  <p className="text-2xl font-bold text-green-500">
                    ${selectedActivity.transactions
                      .filter(t => t.type === 'INCOME')
                      .reduce((sum, t) => sum + t.amount, 0)
                      .toFixed(2)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">淨支出</p>
                  <p className="text-2xl font-bold">
                    ${(totalExpense - selectedActivity.transactions
                      .filter(t => t.type === 'INCOME')
                      .reduce((sum, t) => sum + t.amount, 0))
                      .toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:hidden">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-muted-foreground mb-1">總支出</p>
                  <p className="text-xl font-bold">${totalExpense.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-muted-foreground mb-1">總收入</p>
                  <p className="text-xl font-bold text-green-500">
                    ${selectedActivity.transactions
                      .filter(t => t.type === 'INCOME')
                      .reduce((sum, t) => sum + t.amount, 0)
                      .toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-muted-foreground mb-1">淨支出</p>
                  <p className="text-xl font-bold">
                    ${(totalExpense - selectedActivity.transactions
                      .filter(t => t.type === 'INCOME')
                      .reduce((sum, t) => sum + t.amount, 0))
                      .toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>活動交易明細</CardTitle>
            </CardHeader>
            <CardContent>
              {/* 桌機 table 版 */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日期</TableHead>
                      <TableHead>類型</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>金額</TableHead>
                      <TableHead>參與者</TableHead>
                      <TableHead>類別</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedActivity.transactions
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {new Date(transaction.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${
                              transaction.type === 'EXPENSE' ? 'text-red-500' : 'text-green-500'
                            }`}>
                              {transaction.type === 'EXPENSE' ? '支出' : '收入'}
                            </span>
                          </TableCell>
                          <TableCell>{transaction.description || '無描述'}</TableCell>
                          <TableCell>
                            <span className={`font-medium ${
                              transaction.type === 'EXPENSE' ? 'text-red-500' : 'text-green-500'
                            }`}>
                              {transaction.type === 'EXPENSE' ? '-' : '+'}${transaction.amount.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {transaction.groupMember?.user?.name || transaction.groupMember?.name || '無'}
                          </TableCell>
                          <TableCell>{transaction.category.name}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
              {/* 手機卡片版 */}
              <div className="flex flex-col gap-3 sm:hidden">
                {selectedActivity.transactions
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((transaction) => (
                    <div key={transaction.id} className="rounded-lg bg-gray-50 p-3 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.type === 'EXPENSE' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {transaction.type === 'EXPENSE' ? '支出' : '收入'}
                        </span>
                        <span className="text-xs text-muted-foreground">{new Date(transaction.date).toLocaleDateString()}</span>
                      </div>
                      <div className="text-base font-medium">
                        {transaction.description || '無描述'}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${
                          transaction.type === 'EXPENSE' ? 'text-red-500' : 'text-green-500'
                        }`}>
                          {transaction.type === 'EXPENSE' ? '-' : '+'}${transaction.amount.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {transaction.groupMember?.user?.name || transaction.groupMember?.name || '無'}
                        </span>
                        <span className="text-xs text-muted-foreground">{transaction.category.name}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>結算明細</CardTitle>
            </CardHeader>
            <CardContent>
              {/* 桌機 table 版 */}
              <div className="overflow-x-auto hidden sm:block">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>參與者</TableHead>
                      <TableHead>應付金額</TableHead>
                      <TableHead>已付金額</TableHead>
                      <TableHead>待付金額</TableHead>
                      <TableHead>付款狀態</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants.map((participant) => {
                      const paidAmount = calculatePaidAmount(participant.id);
                      const balance = perPersonAmount - paidAmount;
                      const paymentStatus = balance === 0 
                        ? '已結清' 
                        : balance > 0 
                          ? '待付款' 
                          : '待退款';
                      const isExpanded = expandedParticipants.has(participant.id);
                      // 獲取該參與者的所有交易
                      const participantTransactions = selectedActivity.transactions
                        .filter(t => t.groupMember?.id === participant.id)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                      return (
                        <Fragment key={participant.id}>
                          <TableRow>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleParticipant(participant.id)}
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                            <TableCell>{participant.name}</TableCell>
                            <TableCell>${perPersonAmount.toFixed(2)}</TableCell>
                            <TableCell>${paidAmount.toFixed(2)}</TableCell>
                            <TableCell>
                              <span className={`font-medium ${
                                balance > 0 ? 'text-red-500' : balance < 0 ? 'text-green-500' : ''
                              }`}>
                                ${Math.abs(balance).toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                paymentStatus === '已結清' 
                                  ? 'bg-green-100 text-green-800' 
                                  : paymentStatus === '待付款'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {paymentStatus}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={paymentAmount[participant.id] || ''}
                                  onChange={(e) => setPaymentAmount(prev => ({ ...prev, [participant.id]: e.target.value }))}
                                  className="w-24 px-2 py-1 border rounded"
                                  placeholder="金額"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handlePayment(participant.id)}
                                  disabled={isSubmitting[participant.id]}
                                >
                                  {isSubmitting[participant.id] ? '處理中...' : '付款'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePayment(participant.id, true)}
                                  disabled={isSubmitting[participant.id]}
                                >
                                  {isSubmitting[participant.id] ? '處理中...' : '退款'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && participantTransactions.map((transaction) => (
                            <TableRow key={transaction.id} className="bg-muted/50">
                              <TableCell></TableCell>
                              <TableCell colSpan={6}>
                                <div className="flex justify-between items-center p-2">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        transaction.type === 'EXPENSE' 
                                          ? 'bg-red-100 text-red-800' 
                                          : 'bg-green-100 text-green-800'
                                      }`}>
                                        {transaction.type === 'EXPENSE' ? '支出' : '收入'}
                                      </span>
                                      <span className="font-medium">
                                        {transaction.description || '無描述'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <span>{new Date(transaction.date).toLocaleDateString()}</span>
                                      <span>•</span>
                                      <span>{transaction.category.name}</span>
                                    </div>
                                  </div>
                                  <span className={`font-medium ${
                                    transaction.type === 'EXPENSE' 
                                      ? 'text-red-500' 
                                      : 'text-green-500'
                                  }`}>
                                    {transaction.type === 'EXPENSE' ? '-' : '+'}${transaction.amount.toFixed(2)}
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {/* 手機卡片版 */}
              <div className="flex flex-col gap-4 sm:hidden">
                {participants.map((participant) => {
                  const paidAmount = calculatePaidAmount(participant.id);
                  const balance = perPersonAmount - paidAmount;
                  const paymentStatus = balance === 0 
                    ? '已結清' 
                    : balance > 0 
                      ? '待付款' 
                      : '待退款';
                  const isExpanded = expandedParticipants.has(participant.id);
                  const participantTransactions = selectedActivity.transactions
                    .filter(t => t.groupMember?.id === participant.id)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  return (
                    <div key={participant.id} className="rounded-lg shadow bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-lg">{participant.name}</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleParticipant(participant.id)}
                        >
                          {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2 text-sm">
                        <div>應付：<span className="font-bold">${perPersonAmount.toFixed(2)}</span></div>
                        <div>已付：<span className="font-bold">${paidAmount.toFixed(2)}</span></div>
                        <div>待付：<span className={`font-bold ${balance > 0 ? 'text-red-500' : balance < 0 ? 'text-green-500' : ''}`}>${Math.abs(balance).toFixed(2)}</span></div>
                        <div>狀態：<span className={`px-2 py-1 rounded-full text-xs ${
                          paymentStatus === '已結清' 
                            ? 'bg-green-100 text-green-800' 
                            : paymentStatus === '待付款'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>{paymentStatus}</span></div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={paymentAmount[participant.id] || ''}
                          onChange={(e) => setPaymentAmount(prev => ({ ...prev, [participant.id]: e.target.value }))}
                          className="w-20 px-2 py-1 border rounded"
                          placeholder="金額"
                        />
                        <Button
                          size="sm"
                          onClick={() => handlePayment(participant.id)}
                          disabled={isSubmitting[participant.id]}
                        >
                          {isSubmitting[participant.id] ? '處理中...' : '付款'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePayment(participant.id, true)}
                          disabled={isSubmitting[participant.id]}
                        >
                          {isSubmitting[participant.id] ? '處理中...' : '退款'}
                        </Button>
                      </div>
                      {isExpanded && (
                        <div className="mt-4 border-t pt-3">
                          <div className="font-semibold mb-2 text-base">交易明細</div>
                          <div className="flex flex-col gap-2">
                            {participantTransactions.length === 0 && <div className="text-sm text-muted-foreground">無交易紀錄</div>}
                            {participantTransactions.map((transaction) => (
                              <div key={transaction.id} className="flex justify-between items-center p-2 rounded bg-gray-50">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      transaction.type === 'EXPENSE' 
                                        ? 'bg-red-100 text-red-800' 
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {transaction.type === 'EXPENSE' ? '支出' : '收入'}
                                    </span>
                                    <span className="font-medium">{transaction.description || '無描述'}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {new Date(transaction.date).toLocaleDateString()} • {transaction.category.name}
                                  </div>
                                </div>
                                <span className={`font-medium ${
                                  transaction.type === 'EXPENSE' 
                                    ? 'text-red-500' 
                                    : 'text-green-500'
                                }`}>
                                  {transaction.type === 'EXPENSE' ? '-' : '+'}${transaction.amount.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}