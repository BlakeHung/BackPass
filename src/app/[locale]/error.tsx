"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // 回報錯誤到 API
    fetch("/api/report-error", {
      method: "POST",
      body: JSON.stringify({ message: error.message, stack: error.stack }),
      headers: { "Content-Type": "application/json" },
    });
    // 3 秒後自動導向 dashboard
    const timer = setTimeout(() => {
      router.replace("/dashboard");
    }, 3000);
    return () => clearTimeout(timer);
  }, [error, router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown === 0) {
      router.replace("/dashboard");
    }
  }, [countdown, router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h2 className="text-2xl font-bold mb-4">發生錯誤</h2>
      <p className="mb-2">{error.message}</p>
      <p className="mb-4">{countdown} 秒後自動返回首頁...</p>
      <button onClick={() => reset()} className="btn btn-primary">重試</button>
    </div>
  );
} 