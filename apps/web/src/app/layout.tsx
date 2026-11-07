import type { Metadata } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import { Providers } from '@/providers/providers';
import './globals.css';
import './cash.css';

// Rasmiy, o‘qilishi oson shrift. Build vaqtida yuklab olinadi va saytning o‘zidan beriladi (tashqi so‘rov yo‘q).
// latin-ext — o‘zbek lotin harflari (o‘, g‘, ʼ), cyrillic — kirill yozuvidagi ism va matnlar uchun.
const plexSans = IBM_Plex_Sans({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: { default: 'TKTI StartUp Club', template: '%s · TKTI StartUp Club' },
  description: 'Startaplarni boshqarish va rivojlanishini kuzatish platformasi',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz" className={plexSans.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
