import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { LayoutShell } from '@/components/LayoutShell';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'VERA — Proof-Gated Money | Audited Milestone Escrows',
  description:
    'Every rupee traceable. Audited before it moves. VERA binds capital to verified physical progress with tamper-evident escrows and public audit trails.',
  keywords: [
    'trust layer',
    'milestone escrow',
    'audit ledger',
    'cryptographic proof',
    'donation transparency',
    'SHA-256 evidence',
    'AI OCR verification',
  ],
  authors: [{ name: 'VERA Core Architecture' }],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'VERA — Proof-Gated Money',
    description: 'Every rupee traceable. Audited before it moves.',
    type: 'website',
    locale: 'en_US',
    siteName: 'VERA',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VERA — Proof-Gated Money',
    description: 'Every rupee traceable. Audited before it moves.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased bg-white text-ink font-sans selection:bg-accent selection:text-white`}
      data-theme="light"
      style={{ colorScheme: 'light' }}
    >
      <body className="min-h-full flex flex-col bg-white text-ink relative">
        <LayoutShell>
          <main className="flex-1 w-full">
            {children}
          </main>
        </LayoutShell>
      </body>
    </html>
  );
}
