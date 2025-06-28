import { NextIntlClientProvider } from 'next-intl';
import { getMessages, locales, type Locale } from '@/lib/i18n';
import { Toaster } from 'sonner';
import { Geist, Geist_Mono } from "next/font/google";
import { Inter } from 'next/font/google';
import '../globals.css';
import { setRequestLocale } from '@/lib/i18n';
import { Analytics } from '@vercel/analytics/react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

// 生成靜態參數
export function generateStaticParams() {
  return locales.map(locale => ({ locale }));
}

// 設置元數據
export const metadata = {
  title: 'FinConnect | Amis Family Event Financial Management',
  description: 'Financial management system designed for Amis family events, offering budget planning, expense tracking, and financial reporting',
  icons: {
    icon: '/favicon-32.png',
    shortcut: '/favicon-16.png',
    apple: '/apple-touch-icon.png'
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://amis-management.vercel.app'
  ),
  openGraph: {
    title: 'FinConnect | Amis Family Event Financial Management',
    description: 'Financial management system designed for Amis family events, easily manage event budgets and expenses',
    url: 'https://finconnect-management.vercel.app',
    siteName: 'FinConnect',
    images: [
      {
        url: '/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: 'FinConnect - Amis Family Event Financial Management'
      },
      {
        url: '/og-image-800x800.png',
        width: 800,
        height: 800,
        alt: 'FinConnect - Amis Family Event Financial Management'
      },
      {
        url: '/og-image-600x600.png',
        width: 600,
        height: 600,
        alt: 'FinConnect - Amis Family Event Financial Management'
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FinConnect | Amis Family Event Financial Management',
    description: 'Financial management system designed for Amis family events',
    images: ['/og-image-1200x630.png'],
  },
  other: {
    'line-share': 'FinConnect - Amis Family Event Financial Management',
  },
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  const messages = await getMessages(locale);

  return (
    <html suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </head>
      <body className="min-h-screen">
        <NextIntlClientProvider 
          locale={locale} 
          messages={messages} 
          timeZone="Asia/Taipei"
          now={new Date()}
        >
          <div className={inter.className}>
            {children}
            <Toaster />
            <Analytics />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
} 