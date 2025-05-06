import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { message, stack } = req.body;
    // 印出錯誤
    console.error('前端錯誤回報:', { message, stack });

    // 發送到 Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      const text = `🚨 *AMIS Management 錯誤*\n${message}\n\n\`\`\`${stack || ''}\`\`\``;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
        }),
      });
    }

    res.status(200).json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error logging failed' });
  }
} 