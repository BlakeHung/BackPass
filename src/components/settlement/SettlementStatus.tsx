// src/components/settlement/SettlementStatus.tsx

interface SettlementStatusProps {
    status: string;
  }
  
  const STATUS_CONFIG = {
    PENDING: { text: '未結算', color: 'bg-red-100 text-red-800' },
    PARTIAL: { text: '部分結算', color: 'bg-yellow-100 text-yellow-800' },
    PAID: { text: '已結算', color: 'bg-green-100 text-green-800' },
    OVERPAID: { text: '溢付', color: 'bg-purple-100 text-purple-800' },
  };
  
  export function SettlementStatus({ status }: SettlementStatusProps) {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
    
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${config.color}`}>
        {config.text}
      </span>
    );
  }