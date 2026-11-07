'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Grid2X2,
  List,
  LoaderCircle,
  MapPin,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch, toQuery } from '@/lib/api';
import { formatDate, initials, statusLabels } from '@/lib/format';
import { Stage, Startup } from '@/lib/types';
import { EmptyState, ErrorState, PageLoader, StageBadge, StatusBadge } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

interface ListResponse {
  items: Startup[];
  meta: { page: number; limit: number; total: number; pages: number };
}

const PAGE_SIZE = 20;
const logoColors = [
  ['#e8f3ff', '#0969c8'], ['#eef0fb', '#4f5fb2'], ['#fff2e3', '#bb6b12'], ['#e9f4fa', '#1679a5'],
];

function logoStyle(index: number) {
  const [soft, color] = logoColors[index % logoColors.length];
  return { '--logo-soft': soft, '--logo-color': color } as React.CSSProperties;
}

type SortField = 'updatedAt' | 'name' | 'joinedAt' | 'stage' | 'status' | 'curator' | 'team';
type SortOrder = 'asc' | 'desc';
const SORT_FIELDS: SortField[] = ['updatedAt', 'name', 'joinedAt', 'stage', 'status', 'curator', 'team'];
// Kartochka ko‘rinishi va telefon uchun tayyor saralash variantlari
const SORT_PRESETS: { value: string; label: string }[] = [
  { value: 'updatedAt:desc', label: 'Oxirgi yangilangan' },
  { value: 'joinedAt:desc', label: 'Yangi qo‘shilgan' },
  { value: 'joinedAt:asc', label: 'Eski qo‘shilgan' },
  { value: 'name:asc', label: 'Nomi (A–Z)' },
  { value: 'name:desc', label: 'Nomi (Z–A)' },
  { value: 'stage:asc', label: 'Bosqich (boshidan)' },
  { value: 'stage:desc', label: 'Bosqich (oxiridan)' },
  { value: 'team:desc', label: 'Jamoa (kattasi)' },
];
// Yangi ustunda birinchi bosilganda qaysi tartib tabiiy
const DEFAULT_ORDER: Record<SortField, SortOrder> = {
  updatedAt: 'desc', name: 'asc', joinedAt: 'desc', stage: 'asc', status: 'asc', curator: 'asc', team: 'desc',
};

function SortHeader({ field, label, sort, order, onSort }: {
  field: SortField; label: string; sort: SortField; order: SortOrder; onSort: (field: SortField) => void;
}) {
  const active = sort === field;
  const Icon = !active ? ArrowUpDown : order === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className={`sort-header ${active ? 'active' : ''}`} onClick={() => onSort(field)}>
        {label} <Icon size={12} aria-hidden="true" />
      </button>
    </th>
  );
}

export default function StartupsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [stageId, setStageId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortField>('updatedAt');
  const [order, setOrder] = useState<SortOrder>('desc');
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [exporting, setExporting] = useState(false);
  const canCreate = user?.role !== 'VIEWER';

  // Holat manzildan tiklanadi: startapni ochib "orqaga" qaytganda filtrlar va sahifa saqlanib qoladi
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') ?? '';
    setSearch(q);
    setAppliedSearch(q.trim());
    setStageId(params.get('bosqich') ?? '');
    setStatus(params.get('holat') ?? '');
    setPage(Math.max(1, Number(params.get('sahifa')) || 1));
    const sortParam = params.get('saralash') as SortField | null;
    if (sortParam && SORT_FIELDS.includes(sortParam)) setSort(sortParam);
    const orderParam = params.get('tartib');
    if (orderParam === 'asc' || orderParam === 'desc') setOrder(orderParam);
    const viewParam = params.get('korinish');
    // Telefonda jadval yon tomonga suriladi — kartochka ko‘rinishi qulayroq
    setView(viewParam === 'grid' || viewParam === 'table' ? viewParam : window.matchMedia('(max-width: 650px)').matches ? 'grid' : 'table');
    setReady(true);
  }, []);

  // Qidiruv har harfda emas, yozish to‘xtagach yuboriladi
  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Joriy holatni manzilga yozamiz (tarixga yangi qadam qo‘shmasdan)
  useEffect(() => {
    if (!ready) return;
    const isDefaultSort = sort === 'updatedAt' && order === 'desc';
    const query = toQuery({
      q: appliedSearch,
      bosqich: stageId,
      holat: status,
      sahifa: page > 1 ? page : undefined,
      saralash: isDefaultSort ? undefined : sort,
      tartib: isDefaultSort ? undefined : order,
      korinish: view,
    });
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${query}`);
  }, [ready, appliedSearch, stageId, status, page, sort, order, view]);

  function changeSort(field: SortField) {
    if (field === sort) setOrder((value) => (value === 'asc' ? 'desc' : 'asc'));
    else { setSort(field); setOrder(DEFAULT_ORDER[field]); }
    setPage(1);
  }

  const filters = { search: appliedSearch, stageId, status, sort, order };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['startups', filters, page],
    queryFn: () => apiFetch<ListResponse>(`/startups${toQuery({ ...filters, page, limit: PAGE_SIZE })}`),
    enabled: ready,
    // Filtr o‘zgarganda eski ro‘yxat ko‘rinib turadi: sahifa "sakramaydi" va qidiruv maydoni fokusni yo‘qotmaydi
    placeholderData: keepPreviousData,
  });
  const { data: stages = [] } = useQuery({ queryKey: ['stages'], queryFn: () => apiFetch<Stage[]>('/stages') });

  // Qidiruv natijasi kamayib, joriy sahifa mavjud bo‘lmay qolsa, oxirgi sahifaga qaytamiz
  useEffect(() => {
    if (data && data.meta.pages > 0 && page > data.meta.pages) setPage(data.meta.pages);
  }, [data, page]);

  async function exportCsv() {
    setExporting(true);
    try {
      // Faqat joriy sahifani emas, filtrga mos barcha startaplarni olamiz
      const items: Startup[] = [];
      for (let current = 1; ; current += 1) {
        const result = await apiFetch<ListResponse>(`/startups${toQuery({ ...filters, page: current, limit: 100 })}`);
        items.push(...result.items);
        if (current >= result.meta.pages || !result.items.length) break;
      }
      if (!items.length) {
        toast.info('Eksport uchun startap yo‘q');
        return;
      }
      const rows = [
        ['Nomi', 'Yo‘nalish', 'Bosqich', 'Holat', 'Kurator', 'Jamoa', 'Joylashuv', 'Qo‘shilgan sana'],
        ...items.map((item) => [
          item.name,
          item.industry || '',
          item.currentStage.name,
          statusLabels[item.status] || item.status,
          item.curator?.fullName || '',
          String(item._count?.members || item.teamSize || ''),
          item.location || '',
          formatDate(item.joinedAt),
        ]),
      ];
      const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
      const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `startaplar-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success(`${items.length} ta startap eksport qilindi`);
    } catch (exportError) {
      toast.error(exportError instanceof Error ? exportError.message : 'CSV faylni tayyorlab bo‘lmadi');
    } finally {
      setExporting(false);
    }
  }

  const open = (id: string) => router.push(`/startups/${id}`);
  const onRowKey = (event: React.KeyboardEvent, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open(id);
    }
  };
  const hasFilters = Boolean(search || stageId || status);
  const resetFilters = () => { setSearch(''); setStageId(''); setStatus(''); setPage(1); };

  const toolbar = (
    <div className="toolbar">
      <div className="toolbar-group">
        <label className="search-box">
          <Search size={17} />
          <input
            type="search"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Startap nomini qidiring..."
            aria-label="Startap nomini qidirish"
          />
        </label>
        <select className="select-control" aria-label="Bosqich" value={stageId} onChange={(event) => { setStageId(event.target.value); setPage(1); }}>
          <option value="">Barcha bosqichlar</option>
          {stages.filter((stage) => stage.isActive).map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
        </select>
        <select className="select-control" aria-label="Holat" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">Barcha holatlar</option>
          <option value="ACTIVE">Faol</option>
          <option value="PAUSED">To‘xtatilgan</option>
          <option value="GRADUATED">Bitirgan</option>
          <option value="ARCHIVED">Arxivlangan</option>
        </select>
        <select
          className="select-control"
          aria-label="Saralash"
          value={`${sort}:${order}`}
          onChange={(event) => {
            const [field, direction] = event.target.value.split(':') as [SortField, SortOrder];
            setSort(field); setOrder(direction); setPage(1);
          }}
        >
          {!SORT_PRESETS.some((preset) => preset.value === `${sort}:${order}`) && <option value={`${sort}:${order}`}>Jadval bo‘yicha saralangan</option>}
          {SORT_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
        </select>
        {isFetching && !isLoading && <span className="fetch-indicator"><LoaderCircle className="spin" size={14} /> Yangilanmoqda</span>}
      </div>
      <div className="toolbar-group">
        <button className="button button-secondary" onClick={() => void exportCsv()} disabled={exporting || !data?.meta.total}>
          {exporting ? <LoaderCircle className="spin" size={16} /> : <Download size={16} />} CSV
        </button>
        <div className="view-toggle" aria-label="Ko‘rinish turi">
          <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')} aria-label="Jadval ko‘rinishi" aria-pressed={view === 'table'}><List size={16} /></button>
          <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} aria-label="Kartochka ko‘rinishi" aria-pressed={view === 'grid'}><Grid2X2 size={16} /></button>
        </div>
      </div>
    </div>
  );

  if (!ready || isLoading) return <>{toolbar}<PageLoader /></>;
  if (error && !data) return <>{toolbar}<ErrorState error={error} onRetry={() => void refetch()} /></>;

  const items = data?.items ?? [];
  const meta = data?.meta ?? { page: 1, limit: PAGE_SIZE, total: 0, pages: 1 };
  const from = meta.total ? (meta.page - 1) * meta.limit + 1 : 0;
  const to = Math.min(meta.page * meta.limit, meta.total);

  const footer = (
    <div className="table-footer">
      <span>{meta.total} ta startapdan {from}–{to} ko‘rsatildi</span>
      {meta.pages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} aria-label="Oldingi sahifa"><ChevronLeft size={15} /></button>
          <button className="current" aria-current="page" tabIndex={-1}>{page} / {meta.pages}</button>
          <button disabled={page >= meta.pages} onClick={() => setPage((value) => value + 1)} aria-label="Keyingi sahifa"><ChevronRight size={15} /></button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {toolbar}

      {!items.length ? (
        <div className="card">
          {hasFilters ? (
            <EmptyState
              icon={<Search size={23} />}
              title="Startap topilmadi"
              description="Qidiruv yoki filtrlarni o‘zgartirib ko‘ring."
              action={<button className="button button-secondary" onClick={resetFilters}>Filtrlarni tozalash</button>}
            />
          ) : (
            <EmptyState
              icon={<Plus size={23} />}
              title="Hozircha startaplar yo‘q"
              description="Klubdagi birinchi loyihani tizimga kiriting."
              action={canCreate ? <Link href="/startups/new" className="button button-primary"><Plus size={16} /> Startap qo‘shish</Link> : undefined}
            />
          )}
        </div>
      ) : view === 'table' ? (
        <div className="card">
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <SortHeader field="name" label="STARTAP" sort={sort} order={order} onSort={changeSort} />
                  <SortHeader field="stage" label="BOSQICH" sort={sort} order={order} onSort={changeSort} />
                  <SortHeader field="status" label="HOLAT" sort={sort} order={order} onSort={changeSort} />
                  <SortHeader field="curator" label="KURATOR" sort={sort} order={order} onSort={changeSort} />
                  <SortHeader field="team" label="JAMOA" sort={sort} order={order} onSort={changeSort} />
                  <SortHeader field="joinedAt" label="QO‘SHILGAN" sort={sort} order={order} onSort={changeSort} />
                </tr>
              </thead>
              <tbody>
                {items.map((startup, index) => (
                  <tr key={startup.id} onClick={() => open(startup.id)} onKeyDown={(event) => onRowKey(event, startup.id)} role="link" tabIndex={0}>
                    <td>
                      <div className="table-startup">
                        <div className="startup-logo" style={logoStyle(index)}>
                          {startup.logoUrl ? <img src={startup.logoUrl} alt="" /> : initials(startup.name)}
                        </div>
                        <div><strong>{startup.name}</strong><span>{startup.industry || 'Yo‘nalish kiritilmagan'}</span></div>
                      </div>
                    </td>
                    <td><StageBadge name={startup.currentStage.name} color={startup.currentStage.color} /></td>
                    <td><StatusBadge status={startup.status} /></td>
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
          {footer}
        </div>
      ) : (
        <>
          <div className="startup-card-grid">
            {items.map((startup, index) => (
              <article className="card startup-card" key={startup.id} onClick={() => open(startup.id)} onKeyDown={(event) => onRowKey(event, startup.id)} role="link" tabIndex={0}>
                <div className="startup-card-head">
                  <div className="startup-card-name">
                    <div className="startup-logo" style={logoStyle(index)}>{startup.logoUrl ? <img src={startup.logoUrl} alt="" /> : initials(startup.name)}</div>
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
          <div className="list-footer">{footer}</div>
        </>
      )}
    </>
  );
}
