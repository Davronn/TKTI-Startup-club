'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ClipboardList, Filter } from 'lucide-react';
import { useState } from 'react';
import { apiFetch, toQuery } from '@/lib/api';
import { formatDate, initials } from '@/lib/format';
import { ErrorState, PageLoader } from '@/components/ui';

interface AuditItem {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  changes?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: { id: string; fullName: string; email: string } | null;
}
interface AuditResponse {
  items: AuditItem[];
  entities: string[];
  meta: { page: number; limit: number; total: number; pages: number };
}

const actionLabels: Record<string, string> = {
  CREATE: 'Yaratildi', UPDATE: 'Yangilandi', DELETE: 'O‘chirildi', ARCHIVE: 'Arxivlandi',
  RESTORE: 'Tiklandi', LOGIN: 'Kirish', LOGOUT: 'Chiqish', STAGE_CHANGE: 'Bosqich o‘zgardi',
};

const entityLabels: Record<string, string> = {
  Startup: 'Startap', StartupNote: 'Izoh', StartupFile: 'Fayl', StartupStage: 'Bosqich', StartupMilestone: 'Vazifa',
  StartupFinanceProfile: 'Moliya sozlamalari', StartupFinanceTransaction: 'Moliyaviy operatsiya', StartupFundingRound: 'Investitsiya raundi',
  CashTransaction: 'Kassa yozuvi', CashSettings: 'Kassa sozlamalari',
  User: 'Foydalanuvchi', UserPassword: 'Parol', UserSession: 'Sessiya',
};
const entityLabel = (value: string) => entityLabels[value] || value;

export default function AuditPage() {
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);
  const query = toQuery({ action, entity, page, limit: 30 });
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['audit', action, entity, page],
    queryFn: () => apiFetch<AuditResponse>(`/audit${query}`),
    placeholderData: keepPreviousData,
  });

  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorState error={error} title="Audit jurnalini yuklab bo‘lmadi" onRetry={() => void refetch()} />;

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-group">
          <span className="audit-filter-icon"><Filter size={15} /></span>
          <select className="select-control" value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }}>
            <option value="">Barcha amallar</option>
            {Object.entries(actionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select className="select-control" value={entity} onChange={(event) => { setEntity(event.target.value); setPage(1); }}>
            <option value="">Barcha obyektlar</option>
            {data.entities.map((value) => <option key={value} value={value}>{entityLabel(value)}</option>)}
          </select>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>{data.meta.total} ta hodisa</span>
      </div>
      <section className="card audit-card">
        <div className="data-table-wrap">
          <table className="data-table audit-table">
            <thead><tr><th>VAQT</th><th>FOYDALANUVCHI</th><th>AMAL</th><th>OBYEKT</th><th>IP MANZIL</th><th>TAFSILOT</th></tr></thead>
            <tbody>{data.items.map((item) => <tr key={item.id}>
              <td className="muted">{formatDate(item.createdAt, true)}</td>
              <td>{item.user ? <div className="person-cell"><span className="avatar avatar-sm">{initials(item.user.fullName)}</span><span>{item.user.fullName}</span></div> : <span className="muted">Tizim</span>}</td>
              <td><span className={`audit-action audit-${item.action.toLowerCase()}`}>{actionLabels[item.action] || item.action}</span></td>
              <td><strong>{entityLabel(item.entity)}</strong>{item.entityId && <small className="audit-id">{item.entityId.slice(0, 8)}…</small>}</td>
              <td className="muted">{item.ipAddress || '—'}</td>
              <td>{item.changes ? <details className="audit-details"><summary>Ko‘rish</summary><pre>{JSON.stringify(item.changes, null, 2)}</pre></details> : <span className="muted">—</span>}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {!data.items.length && <div className="finance-empty"><ClipboardList size={24} /><strong>Hodisalar topilmadi</strong><span>Filtrlarni o‘zgartirib ko‘ring.</span></div>}
        {data.meta.pages > 1 && <div className="table-footer"><span>{data.meta.page} / {data.meta.pages} sahifa</span><div className="pagination"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={15} /></button><button className="current" aria-current="page" tabIndex={-1}>{page}</button><button disabled={page >= data.meta.pages} onClick={() => setPage((value) => value + 1)}><ChevronRight size={15} /></button></div></div>}
      </section>
    </>
  );
}
