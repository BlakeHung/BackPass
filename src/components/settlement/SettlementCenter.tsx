// src/components/settlement/SettlementCenter.tsx

'use client';

import { useState } from 'react';
import { ActivityWithSettlements, SettlementWithRelations } from '@/types/settlement';
import { SettlementSummary } from './SettlementSummary';
import { SettlementList } from './SettlementList';
import { SettlementChart } from './SettlementChart';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface SettlementCenterProps {
  activity?: ActivityWithSettlements;
  settlements?: SettlementWithRelations[];
}

export function SettlementCenter({ activity, settlements }: SettlementCenterProps) {
  const router = useRouter();
  const [isCalculating, setIsCalculating] = useState(false);
  const displaySettlements = activity?.settlements || settlements || [];

  const handleCalculate = async () => {
    if (!activity?.id) return;
    
    try {
      setIsCalculating(true);
      const response = await fetch(
        `/api/activities/${activity.id}/settlements`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '計算失敗');
      }
      
      router.refresh();
    } catch (error) {
      console.error('計算失敗:', error);
      // 可以在這裡添加錯誤提示
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {activity?.name ? `${activity.name} - 結算中心` : '結算中心'}
        </h1>
        {activity?.id && (
          <Button 
            onClick={handleCalculate}
            disabled={isCalculating}
          >
            {isCalculating ? '計算中...' : '重新計算'}
          </Button>
        )}
      </div>

      {activity && <SettlementSummary activity={activity} />}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SettlementChart settlements={displaySettlements} />
        <SettlementList settlements={displaySettlements} />
      </div>
    </div>
  );
}