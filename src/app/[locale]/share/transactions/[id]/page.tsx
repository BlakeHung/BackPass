import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function SharedTransactionPage({
  params,
}: {
  params: { id: string };
}) {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        amount: true,
        date: true,
        description: true,
        images: true,
        category: {
          select: {
            id: true,
            name: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
          }
        },
      },
    });

    if (!transaction) {
      notFound();
    }

    // 確保數據格式正確
    const safeTransaction = {
      ...transaction,
      amount: Number(transaction.amount), // 確保 amount 是數字
      images: Array.isArray(transaction.images) ? transaction.images : [], // 確保 images 是陣列
      date: transaction.date instanceof Date ? transaction.date : new Date(transaction.date), // 確保日期正確
    };

    return (
      <div className="container mx-auto p-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">支出詳情</h1>
            <p className="text-sm text-gray-500">分享檢視</p>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-gray-600">金額</h3>
              <p className="text-2xl font-bold">${safeTransaction.amount.toLocaleString()}</p>
            </div>

            <div>
              <h3 className="text-gray-600">類別</h3>
              <p>{safeTransaction.category?.name || '未分類'}</p>
            </div>

            <div>
              <h3 className="text-gray-600">日期</h3>
              <p>{safeTransaction.date.toLocaleDateString()}</p>
            </div>

            <div>
              <h3 className="text-gray-600">說明</h3>
              <p>{safeTransaction.description || '無說明'}</p>
            </div>

            {Array.isArray(safeTransaction.images) && safeTransaction.images.length > 0 && (
              <div>
                <h3 className="text-gray-600">附件</h3>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {safeTransaction.images.map((image: string, index: number) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Receipt ${index + 1}`}
                      className="rounded-lg w-full object-cover"
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <h3 className="text-gray-600">記錄者</h3>
              <p>{safeTransaction.user?.name || '未知'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("載入支出詳情錯誤:", error);
    
    // 返回友好的錯誤訊息
    return (
      <div className="container mx-auto p-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">載入支出詳情時發生錯誤</h2>
          <p>請稍後再試或聯繫管理員</p>
          <p className="text-sm text-gray-500 mt-4">錯誤訊息: {(error as Error).message}</p>
        </div>
      </div>
    );
  }
}