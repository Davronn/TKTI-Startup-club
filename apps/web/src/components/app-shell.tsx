'use client';

import {
  BarChart3,
  Building2,
  ClipboardList,
  KanbanSquare,
  Lock,
  LogOut,
  Menu,
  Plus,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { initials, roleLabels } from '@/lib/format';
import { Logo } from './logo';
import { EmptyState, PageLoader } from './ui';

const navigation = [
  { href: '/dashboard', label: 'Boshqaruv paneli', icon: BarChart3 },
  { href: '/startups', label: 'Startaplar', icon: Building2 },
  { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/kassa', label: 'Bo‘lim kassasi', icon: Wallet },
  { href: '/settings/security', label: 'Xavfsizlik', icon: ShieldCheck },
  { href: '/users', label: 'Foydalanuvchilar', icon: Users, adminOnly: true },
  { href: '/audit', label: 'Audit jurnali', icon: ClipboardList, adminOnly: true },
  { href: '/settings/stages', label: 'Sozlamalar', icon: Settings, adminOnly: true },
];

const titleMap: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Boshqaruv paneli', subtitle: 'Klub holati va asosiy ko‘rsatkichlar' },
  '/startups': { title: 'Startaplar', subtitle: 'Klubdagi barcha loyihalarni boshqaring' },
  '/pipeline': { title: 'Pipeline', subtitle: 'Startaplar rivojlanish bosqichlari' },
  '/users': { title: 'Foydalanuvchilar', subtitle: 'Jamoa a’zolari va ruxsatlarni boshqaring' },
  '/audit': { title: 'Audit jurnali', subtitle: 'Muhim amallar va xavfsizlik hodisalari' },
  '/settings/stages': { title: 'Bosqichlar', subtitle: 'Pipeline bosqichlarini sozlang' },
  '/settings/security': { title: 'Xavfsizlik', subtitle: 'Parol va faol sessiyalar himoyasi' },
  '/kassa': { title: 'Bo‘lim kassasi', subtitle: 'Naqd va karta qoldiqlari, oylik holat' },
  '/kassa/yangi': { title: 'Yangi kassa yozuvi', subtitle: 'Kirim, chiqim yoki hisoblar aro o‘tkazmani qayd eting' },
  '/kassa/jurnal': { title: 'Kassa jurnali', subtitle: 'Barcha operatsiyalar hujjat raqami bilan, kun bo‘yicha' },
  '/kassa/cheklar': { title: 'Cheklar', subtitle: 'Biriktirilgan rasmlar va cheki yo‘q xarajatlar' },
  '/kassa/hisobotlar': { title: 'Kassa hisobotlari', subtitle: 'Excel va Word hisobot, dinamika va yo‘nalishlar' },
  '/kassa/sozlamalar': { title: 'Kassa sozlamalari', subtitle: 'Mas’ullar, boshlang‘ich qoldiq va arxiv' },
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
    if (pathname.startsWith('/kassa/yozuv/'))
      return { title: 'Kassa yozuvini tahrirlash', subtitle: 'O‘zgarishlarni kiriting va saqlang' };
    if (/^\/startups\/[^/]+$/.test(pathname))
      return { title: 'Startap profili', subtitle: 'Loyiha haqida to‘liq ma’lumot' };
    return titleMap[pathname] || titleMap['/dashboard'];
  }, [pathname]);

  // Brauzer yorlig‘ida joriy sahifa nomi (bir nechta yorliq ochiq bo‘lsa, ajratish oson)
  useEffect(() => {
    document.title = `${header.title} · TKTI StartUp Club`;
  }, [header.title]);

  if (loading || !user) return <PageLoader />;
  const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
  // Menyuda yashirilgan bo‘limlar manzil orqali ham ochilmasin
  const adminOnlyPage = navigation.some((item) => item.adminOnly && (pathname === item.href || pathname.startsWith(`${item.href}/`)));
  const content = adminOnlyPage && !isAdmin ? (
    <div className="card">
      <EmptyState
        icon={<Lock size={23} />}
        title="Ruxsat yo‘q"
        description="Bu bo‘lim faqat administratorlar uchun."
        action={<Link href="/dashboard" className="button button-secondary">Boshqaruv paneliga</Link>}
      />
    </div>
  ) : children;

  return (
    <div className="app-layout">
      {mobileOpen && <button className="sidebar-overlay" onClick={() => setMobileOpen(false)} aria-label="Yon menyuni yopish" />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <Logo />
          <button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Yon menyuni yopish">
            <X size={20} />
          </button>
        </div>

        <div className="workspace-card">
          <div className="workspace-icon"><Building2 size={18} /></div>
          <div>
            <small>ISH MAYDONI</small>
            <strong>{organization?.name || 'StartUp Club'}</strong>
          </div>
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
          <button className="icon-button" onClick={() => void logout()} title="Chiqish" aria-label="Tizimdan chiqish">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-title">
            <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Yon menyuni ochish">
              <Menu size={22} />
            </button>
            <div>
              <h1>{header.title}</h1>
              <p>{header.subtitle}</p>
            </div>
          </div>
          <div className="topbar-actions">
            {user.role !== 'VIEWER' && pathname !== '/startups/new' && (
              <Link href="/startups/new" className="button button-primary">
                <Plus size={18} /> <span>Startap qo‘shish</span>
              </Link>
            )}
            <div className="avatar">{initials(user.fullName)}</div>
          </div>
        </header>
        <main className="page-content">{content}</main>
      </div>
    </div>
  );
}
