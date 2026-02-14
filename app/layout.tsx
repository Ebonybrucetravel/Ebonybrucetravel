import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import AppShell from '@/components/AppShell';
const inter = Inter({ subsets: ['latin'] });
export const metadata: Metadata = {
    title: 'Ebony Bruce Travels – Where Global Travel Becomes Easy',
    description: 'A premium global travel booking platform for flights, hotels, and car rentals featuring AI-powered travel planning.',
};
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) {
    return (<html lang="en">
      <body className={inter.className}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>);
}
