import { SettlementWithRelations } from '@/types/settlement';

interface SettlementDetailProps {
  settlement: SettlementWithRelations;
}

export function SettlementDetail({ settlement }: SettlementDetailProps) {
  return (
    <div>
      <h1>結帳明細</h1>
      <div>
        {settlement.activity && <h2>活動: {settlement.activity.name}</h2>}
        <p>成員: {settlement.groupMember.name}</p>
        <p>應付金額: {settlement.shouldPay}</p>
        <p>已付金額: {settlement.paidAmount}</p>
        <p>待付金額: {settlement.balance}</p>
        <p>狀態: {settlement.status}</p>
        {settlement.settledByUser && (
          <p>處理人員: {settlement.settledByUser.name}</p>
        )}
      </div>
      <div>
        <h3>付款記錄</h3>
        {settlement.transactions.map((transaction) => (
          <div key={transaction.id}>
            <p>金額: {transaction.amount}</p>
            <p>日期: {transaction.date.toLocaleDateString()}</p>
            {transaction.description && <p>說明: {transaction.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
