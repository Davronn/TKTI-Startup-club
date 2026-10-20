'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CirclePause,
  GraduationCap,
  Plus,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatDate, initials } from '@/lib/format';
import { Startup } from '@/lib/types';
import { PageLoader, StageBadge, StatusBadge } from '@/components/ui';

interface DashboardData {
  summary: {
    total: number;
    active: number;
    paused: number;
    graduated: number;
    archived: number;
    addedThisMonth: number;
  };
  stages: { id: string; name: string; color: string; position: number; count: number }[];
  recentStartups: Startup[];
  recentActivity: {
    id: string;
    action: string;
    entity: string;
    entityId?: string;
    changes?: Record<string, unknown>;
    createdAt: string;
    user?: { id: string; fullName: string } | null;
  }[];
}

const activityLabels: Record<string, string> = {
  CREATE: 'yangi ma’lumot qo‘shdi',
  UPDATE: 'ma’lumotlarni yangiladi',
  ARCHIVE: 'startapni arxivladi',
  RESTORE: 'startapni tikladi',
  STAGE_CHANGE: 'startap bosqichini o‘zgartirdi',
  LOGIN: 'tizimga kirdi',
  LOGOUT: 'tizimdan chiqdi',
};

const logoColors = [
  ['#e7f5ef', '#0e8c65'],
  ['#eef0fb', '#4f5fb2'],
  ['#fff2e3', '#bb6b12'],
  ['#e9f4fa', '#1679a5'],
];

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<DashboardData>('/dashboard'),
  });

  if (isLoading) return <PageLoader />;
  if (error || !data) return <div className="card empty-state">Ma’lumotlarni yuklab bo‘lmadi.</div>;
  const maxStage = Math.max(...data.stages.map((stage) => stage.count), 1);

  const stats = [
    {
      label: 'Jami startaplar',
      value: data.summary.total,
      icon: Building2,
      color: '#0f8f67',
      soft: '#e5f6ef',
      trend: `+${data.summary.addedThisMonth} bu oy`,
    },
    {
      label: 'Faol loyihalar',
      value: data.summary.active,
      icon: TrendingUp,
      color: '#3b79b8',
      soft: '#e9f1fa',
      trend: `${data.summary.total ? Math.round((data.summary.active / data.summary.total) * 100) : 0}% ulush`,
    },
    {
      label: 'To‘xtatilgan',
      value: data.summary.paused,
      icon: CirclePause,
      color: '#d68b16',
      soft: '#fff3df',
      trend: 'Nazorat talab',
    },
    {
      label: 'Bitirgan startaplar',
      value: data.summary.graduated,
      icon: GraduationCap,
      color: '#6556b2',
      soft: '#efedfa',
      trend: 'Umumiy natija',
    },
  ];

  return (
    <>
      <section className="stats-grid">
        {stats.map((stat) => (
          <article
            className="card stat-card"
            key={stat.label}
            style={{ '--stat-color': stat.color, '--stat-soft': stat.soft } as React.CSSProperties}
          >
            <div className="stat-top">
              <span className="stat-icon"><stat.icon size={18} /></span>
              <span className="stat-trend"><TrendingUp size={12} /> {stat.trend}</span>
            </div>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-column">
          <article className="card">
            <div className="card-header">
              <div><h2>Bosqichlar bo‘yicha taqsimot</h2><p>Startaplarning joriy rivojlanish holati</p></div>
              <Link href="/pipeline" className="text-link">Pipeline <ArrowRight size={13} /></Link>
            </div>
            <div className="card-body stage-chart">
              {data.stages.map((stage) => (
                <div className="stage-chart-row" key={stage.id}>
                  <span>{stage.name}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        '--bar-color': stage.color,
                        width: `${Math.max((stage.count / maxStage) * 100, stage.count ? 5 : 0)}%`,
                      } as React.CSSProperties}
                    />
                  </div>
                  <strong>{stage.count}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="card">
            <div className="card-header">
              <div><h2>Yaqinda qo‘shilgan startaplar</h2><p>Oxirgi ro‘yxatdan o‘tgan loyihalar</p></div>
              <Link href="/startups" className="text-link">Barchasi <ArrowRight size={13} /></Link>
            </div>
            <div className="card-body recent-list">
              {data.recentStartups.length ? data.recentStartups.map((startup, index) => (
                <Link href={`/startups/${startup.id}`} className="recent-row" key={startup.id}>
                  <div
                    className="startup-logo"
                    style={{ '--logo-soft': logoColors[index % 4][0], '--logo-color': logoColors[index % 4][1] } as React.CSSProperties}
                  >
                    {startup.logoUrl ? <img src={startup.logoUrl} alt="" /> : initials(startup.name)}
                  </div>
                  <div className="recent-row-main">
                    <strong>{startup.name}</strong>
                    <span>{startup.industry || 'Yo‘nalish belgilanmagan'} · {startup.location || 'Joylashuv yo‘q'}</span>
                  </div>
                  <StageBadge name={startup.currentStage.name} color={startup.currentStage.color} />
                  <StatusBadge status={startup.status} />
                </Link>
              )) : <p className="muted">Hozircha startaplar yo‘q.</p>}
            </div>
          </article>
        </div>

        <div className="dashboard-column">
          <article className="card">
            <div className="card-header">
              <div><h2>Tezkor amallar</h2><p>Ko‘p ishlatiladigan bo‘limlar</p></div>
            </div>
            <div className="card-body" style={{ display: 'grid', gap: 9 }}>
              <Link href="/startups/new" className="button button-primary"><Plus size={16} /> Yangi startap qo‘shish</Link>
              <Link href="/pipeline" className="button button-secondary"><BarChart3 size={16} /> Pipeline’ni ko‘rish</Link>
            </div>
          </article>

          <article className="card">
            <div className="card-header">
              <div><h2>Oxirgi faollik</h2><p>Tizimdagi so‘nggi o‘zgarishlar</p></div>
            </div>
            <div className="card-body activity-list">
              {data.recentActivity.length ? data.recentActivity.map((item) => (
                <div className="activity-item" key={item.id}>
                  <span className="activity-dot"><UserRound size={13} /></span>
                  <div>
                    <p><strong>{item.user?.fullName || 'Tizim'}</strong> {activityLabels[item.action] || 'amal bajardi'}</p>
                    <time>{formatDate(item.createdAt, true)}</time>
                  </div>
                </div>
              )) : <p className="muted">Faollik yozuvlari hali yo‘q.</p>}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
