// src/components/settlement/LineShareButton.tsx

'use client';

import { useState } from 'react';

interface LineShareButtonProps {
  settlementId: string;
}

export function LineShareButton({ settlementId }: LineShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    try {
      setIsSharing(true);
      const response = await fetch(`/api/settlements/${settlementId}/share`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('分享失敗');
      
      const { lineShareUrl } = await response.json();
      window.open(lineShareUrl, '_blank');
    } catch (error) {
      console.error('分享失敗:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className="inline-flex items-center px-3 py-1 rounded bg-[#00B900] text-white hover:bg-[#00A000] disabled:opacity-50"
    >
      {isSharing ? '分享中...' : '分享'}
    </button>
  );
}