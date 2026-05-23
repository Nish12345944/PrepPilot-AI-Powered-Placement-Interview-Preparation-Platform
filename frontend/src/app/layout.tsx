import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'PrepPilot – AI Placement Prep',
  description: 'AI-powered mock interviews, coding practice, and placement preparation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`} style={{ background: '#050816', color: '#e2e8f0' }}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(15,12,41,0.95)',
              color: '#e2e8f0',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: '12px',
              backdropFilter: 'blur(20px)',
              fontSize: '14px',
            },
          }}
        />
      </body>
    </html>
  );
}
