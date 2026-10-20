'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Grid2X2,
  List,
  MapPin,
  Search,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { apiFetch, toQuery } from '@/lib/api';
import { formatDate, initials } from '@/lib/format';
import { Stage, Startup, StartupStatus } from '@/lib/types';
import { EmptyState, PageLoader, StageBadge, StatusBadge } from '@/components/ui';

interface ListResponse {
  items: Startup[];
  meta: { page: number; limit: number; total: number; pages: number };
}

const logoColors = [
  ['#e7f5ef', '#0e8c65'], ['#eef0fb', '#4f5fb2'], ['#fff2e3', '#bb6b12'], ['#e9f4fa', '#1679a5'],
];

export default function StartupsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [stageId, setStageId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'table' | 'grid'>('table');

  const queryString = useMemo(
    () => toQuery({ search, stageId, status, page, limit: 20 }),
    [search, stageId, status, page],
  );
  const { data, isLoading } = useQuery({
    queryKey: ['startups', search, stageId, status, page],
    queryFn: () => apiFetch<ListResponse>(`/startups${queryString}`),
  });
  const { data: stages = [] } = useQuery({ queryKey: ['stages'], queryFn: () => apiFetch<Stage[]>('/stages') });
  function exportCsv() {
    if (!data?.items.length) return;
    const rows = [
      ['Nomi', 'Yo‘nalish', 'Bosqich', 'Holat', 'Kurator', 'Qo‘shilgan sana'],
      ...data.items.map((item) => [
        item.name,
        item.industry || '',
        item.currentStage.name,
        item.status,
        item.curator?.fullName || '',
        formatDate(item.joinedAt),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `startaplar-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (isLoading) return <PageLoader />;

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-group">
          <label className="search-box">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Startap nomini qidiring..."
            />
          </label>
          <select className="select-control" value={stageId} onChange={(event) => { setStageId(event.target.value); setPage(1); }}>
            <option value="">Barcha bosqichlar</option>
            {stages.filter((stage) => stage.isActive).map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
          </select>
          <select className="select-control" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="">Barcha holatlar</option>
            <option value="ACTIVE">Faol</option>
            <option value="PAUSED">To‘xtatilgan</option>
            <option value="GRADUATED">Bitirgan</option>
            <option value="ARCHIVED">Arxivlangan</option>
          </select>
        </div>
        <div className="toolbar-group">
          <button className="button button-secondary" onClick={exportCsv}><Download size={16} /> CSV</button>
          <div className="view-toggle">
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}><List size={16} /></button>
            <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><Grid2X2 size={16} /></button>
          </div>
        </div>
      </div>

      {!data?.items.length ? (
        <div className="card">
          <EmptyState
            icon={<Search size={23} />}
            title="Startap topilmadi"
            description="Filtrlarni o‘zgartiring yoki yangi startap qo‘shing."
          />
        </div>
      ) : view === 'table' ? (
        <div className="card">
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>STARTAP</th><th>BOSQICH</th><th>HOLAT</th><th>KURATOR</th><th>JAMOA</th><th>QO‘SHILGAN</th></tr></thead>
              <tbody>
                {data.items.map((startup, index) => (
                  <tr key={startup.id} onClick={() => router.push(`/startups/${startup.id}`)}>
                    <td>
                      <div className="table-startup">
                        <div className="startup-logo" style={{ '--logo-soft': logoColors[index % 4][0], '--logo-color': logoColors[index % 4][1] } as React.CSSProperties}>
                          {startup.logoUrl ? <img src={startup.logoUrl} alt="" /> : initials(startup.name)}
                        </div>
                        <div><strong>{startup.name}</strong><span>{startup.industry || 'Yo‘nalish kiritilmagan'}</span></div>
                      </div>
                    </td>
                    <td><StageBadge name={startup.currentStage.name} color={startup.currentStage.color} /></td>
                    <td><StatusBadge status={startup.status as StartupStatus} /></td>
                    <td>
                      {startup.curator ? <div className="person-cell"><span className="avatar avatar-sm">{initials(startup.curator.fullName)}</span><span>{startup.curator.fullName}</span></div> : <span className="muted">Biriktirilmagan</span>}
                    </td>
                    <td><span className="person-cell"><Users size={14} /> {startup._count?.members || startup.teamSize || 0}</span></td>
                    <td className="muted">{formatDate(startup.joinedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            <span>{data.meta.total} ta startapdan {(page - 1) * 20 + 1}–{Math.min(page * 20, data.meta.total)} ko‘rsatildi</span>
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={15} /></button>
              <button disabled>{page}</button>
              <button disabled={page >= data.meta.pages} onClick={() => setPage((value) => value + 1)}><ChevronRight size={15} /></button>
            </div>
          </div>
        </div>
      ) : (
        <div className="startup-card-grid">
          {data.items.map((startup, index) => (
            <article className="card startup-card" key={startup.id} onClick={() => router.push(`/startups/${startup.id}`)}>
              <div className="startup-card-head">
                <div className="startup-card-name">
                  <div className="startup-logo" style={{ '--logo-soft': logoColors[index % 4][0], '--logo-color': logoColors[index % 4][1] } as React.CSSProperties}>{initials(startup.name)}</div>
                  <div><h3>{startup.name}</h3><p>{startup.industry || 'Yo‘nalish kiritilmagan'}</p></div>
                </div>
                <StatusBadge status={startup.status} />
              </div>
              <p>{startup.description || 'Startap haqida tavsif kiritilmagan.'}</p>
              <StageBadge name={startup.currentStage.name} color={startup.currentStage.color} />
              <div className="startup-card-meta">
                <span><MapPin size={13} /> {startup.location || 'Kiritilmagan'}</span>
                <span><Users size={13} /> {startup._count?.members || startup.teamSize || 0} a’zo</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
