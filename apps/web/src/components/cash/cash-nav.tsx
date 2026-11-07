'use client';

import { BarChart3, BookOpen, Home, Plus, ReceiptText, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/kassa', label: 'Bosh sahifa', icon: Home },
  { href: '/kassa/jurnal', label: 'Jurnal', icon: BookOpen },
  { href: '/kassa/cheklar', label: 'Cheklar', icon: ReceiptText },
  { href: '/kassa/hisobotlar', label: 'Hisobotlar', icon: BarChart3 },
  { href: '/kassa/sozlamalar', label: 'Sozlamalar', icon: Settings2 },
];

export function CashNav({ canWrite }: { canWrite: boolean }) {
  const pathname = usePathname();
  return (
    <div className="cash-nav">
      <nav className="cash-tabs" aria-label="Kassa bo‘limlari">
        {items.map((item) => {
          const active = item.href === '/kassa' ? pathname === '/kassa' : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
              <item.icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      {canWrite && (
        <Link href="/kassa/yangi" className="button button-primary">
          <Plus size={16} /> <span>Yangi yozuv</span>
        </Link>
      )}
    </div>
  );
}
