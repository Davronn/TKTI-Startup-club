import Link from 'next/link';
import { Logo } from '@/components/logo';

export const metadata = { title: 'Sahifa topilmadi' };

export default function NotFound() {
  return (
    <main className="system-page">
      <section className="system-panel">
        <div className="login-logo"><Logo /></div>
        <span className="system-code">404</span>
        <h1>Sahifa topilmadi</h1>
        <p>Siz ochmoqchi bo‘lgan sahifa mavjud emas yoki boshqa manzilga ko‘chirilgan.</p>
        <Link href="/dashboard" className="button button-primary">Boshqaruv paneliga qaytish</Link>
      </section>
    </main>
  );
}
