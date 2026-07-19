import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pro Se Wins',
  description: 'A personal litigation command center. Success is the best revenge.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
