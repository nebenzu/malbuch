import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Malbuch Generator - Personalisierte Malbücher aus deinen Fotos',
  description: 'Erstelle einzigartige Malbücher und Malen-nach-Zahlen aus deinen eigenen Fotos. Perfekt als Geschenk!',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
