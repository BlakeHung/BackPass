// src/components/settlement/SettlementList.tsx

import { useState } from 'react';
import { SettlementStatus } from './SettlementStatus';
import { LineShareButton } from './LineShareButton';
import { getStatusText, SettlementWithRelations } from '@/types/settlement';
import Link from 'next/link';

interface SettlementListProps {
  settlements: SettlementWithRelations[];
}

export function SettlementList({ settlements }: SettlementListProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const filteredSettlements = selectedStatus === 'ALL'
    ? settlements
    : settlements.filter(s => s.status === selectedStatus);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <div className="flex gap-2">
          {['ALL', 'PENDING', 'PARTIAL', 'PAID', 'OVERPAID'].map(status => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1 rounded ${
                selectedStatus === status
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100'
              }`}
            >
              {getStatusText(status)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                參與者
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                應付金額
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                已付金額
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                狀態
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                付款方式
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredSettlements.map(settlement => (
              <tr key={settlement.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {settlement.groupMember.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  ${settlement.shouldPay}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  ${settlement.paidAmount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <SettlementStatus status={settlement.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {settlement.paymentMethod || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-2">
                    <Link
                      href={`/settlements/${settlement.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      詳情
                    </Link>
                    <LineShareButton settlementId={settlement.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}