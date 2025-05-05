// src/components/settlement/SettlementSummary.tsx
import { ActivityWithSettlements } from '@/types/settlement';

interface SettlementSummaryProps {
  activity: ActivityWithSettlements;
}

export function SettlementSummary({ activity }: SettlementSummaryProps) {
  const totalBudget = activity.settlements.reduce((sum: number, s) => sum + s.shouldPay, 0);
  const totalPaid = activity.settlements.reduce((sum: number, s) => sum + s.paidAmount, 0);
  const progress = (totalPaid / totalBudget) * 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-gray-500">總預算</h3>
        <p className="text-2xl font-bold">${totalBudget}</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-gray-500">已收款</h3>
        <p className="text-2xl font-bold text-green-600">${totalPaid}</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-gray-500">結算進度</h3>
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-green-600 h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-right">{progress.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}