import { Pie } from 'react-chartjs-2';
import { SettlementWithRelations } from '@/types/settlement';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale
} from 'chart.js';

// 註冊必要的元件
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale
);

interface SettlementChartProps {
  settlements: SettlementWithRelations[];
}

export function SettlementChart({ settlements }: SettlementChartProps) {
  // 使用 settlements 來計算實際的支出分類
  const expenseCategories = settlements.reduce((acc, settlement) => {
    settlement.transactions.forEach(transaction => {
      // 這裡需要根據實際的支出分類邏輯來計算
      // 這只是一個示例
      acc['活動費'] = (acc['活動費'] || 0) + transaction.amount;
    });
    return acc;
  }, {} as Record<string, number>);

  const data = {
    labels: Object.keys(expenseCategories),
    datasets: [{
      data: Object.values(expenseCategories),
      backgroundColor: [
        'rgb(54, 162, 235)',
        'rgb(75, 192, 192)',
        'rgb(255, 205, 86)'
      ]
    }]
  };

  const options = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">支出分類</h3>
      <div className="h-64">
        <Pie data={data} options={options} />
      </div>
    </div>
  );
}
