'use client';

import {
  BarChart3,
  Building2,
  ChevronRight,
  KanbanSquare,
  LogOut,
  Menu,
  Plus,
  Settings,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { initials, roleLabels } from '@/lib/format';
import { Logo } from './logo';
import { PageLoader } from './ui';

const navigation = [
  { href: '/dashboard', label: 'Boshqaruv paneli', icon: BarChart3 },
  { href: '/startups', label: 'Startaplar', icon: Building2 },
  { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/users', label: 'Foydalanuvchilar', icon: Users, adminOnly: true },
  { href: '/settings/stages', label: 'Sozlamalar', icon: Settings, adminOnly: true },
];

const titleMap: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Boshqaruv paneli', subtitle: 'Klub holati va asosiy ko‘rsatkichlar' },
  '/startups': { title: 'Startaplar', subtitle: 'Klubdagi barcha loyihalarni boshqaring' },
  '/pipeline': { title: 'Pipeline', subtitle: 'Startaplar rivojlanish bosqichlari' },
  '/users': { title: 'Foydalanuvchilar', subtitle: 'Jamoa a’zolari va ruxsatlarni boshqaring' },
  '/settings/stages': { title: 'Bosqichlar', subtitle: 'Pipeline bosqichlarini sozlang' },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, organization, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => setMobileOpen(false), [pathname]);

  const header = useMemo(() => {
    if (pathname.startsWith('/startups/new'))
      return { title: 'Yangi startap', subtitle: 'Loyiha ma’lumotlarini tizimga kiriting' };
    if (/^\/startups\/[^/]+\/edit$/.test(pathname))
      return { title: 'Startapni tahrirlash', subtitle: 'Loyiha ma’lumotlarini yangilang' };
    if (/^\/startups\/[^/]+$/.test(pathname))
      return { title: 'Startap profili', subtitle: 'Loyiha haqida to‘liq ma’lumot' };
    return titleMap[pathname] || titleMap['/dashboard'];
  }, [pathname]);

  if (loading || !user) return <PageLoader />;
  const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';

  return (
    <div className="app-layout">
      {mobileOpen && <button className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <Logo />
          <button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="workspace-card">
          <div className="workspace-icon"><Building2 size={18} /></div>
          <div>
            <small>ISH MAYDONI</small>
            <strong>{organization?.name || 'StartUp Club'}</strong>
          </div>
          <ChevronRight size={16} />
        </div>

        <nav className="sidebar-nav">
          <p>ASOSIY MENYU</p>
          {navigation
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
              return (
                <Link key={item.href} href={item.href} className={active ? 'active' : ''}>
                  <item.icon size={19} />
                  <span>{item.label}</span>
                  {active && <i />}
                </Link>
              );
            })}
        </nav>

        <div className="sidebar-user">
          <div className="avatar avatar-dark">{initials(user.fullName)}</div>
          <div>
            <strong>{user.fullName}</strong>
            <span>{roleLabels[user.role]}</span>
          </div>
          <button className="icon-button" onClick={() => void logout()} title="Chiqish">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-title">
            <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)}>
              <Menu size={22} />
            </button>
            <div>
              <h1>{header.title}</h1>
              <p>{header.subtitle}</p>
            </div>
          </div>
          <div className="topbar-actions">
            <Link href="/startups/new" className="button button-primary">
              <Plus size={18} /> <span>Startap qo‘shish</span>
            </Link>
            <div className="avatar">{initials(user.fullName)}</div>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
