'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RotateCcw,
  Send,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { formatDate, initials, statusLabels } from '@/lib/format';
import { Stage, Startup } from '@/lib/types';
import { PageLoader, StageBadge, StatusBadge } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { FinancePanel } from '@/components/finance-panel';
import { MilestonePanel } from '@/components/milestone-panel';

type Tab = 'overview' | 'finance' | 'milestones' | 'team' | 'timeline' | 'notes';

export default function StartupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [note, setNote] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['startup', id], queryFn: () => apiFetch<Startup>(`/startups/${id}`) });
  const { data: stages = [] } = useQuery({ queryKey: ['stages'], queryFn: () => apiFetch<Stage[]>('/stages') });

  const stageMutation = useMutation({
    mutationFn: (stageId: string) => apiFetch(`/startups/${id}/stage`, { method: 'POST', body: JSON.stringify({ stageId }) }),
    onSuccess: () => { toast.success('Bosqich yangilandi'); void queryClient.invalidateQueries({ queryKey: ['startup', id] }); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Bosqichni yangilab bo‘lmadi'),
  });
  const noteMutation = useMutation({
    mutationFn: () => apiFetch(`/startups/${id}/notes`, { method: 'POST', body: JSON.stringify({ content: note }) }),
    onSuccess: () => { setNote(''); toast.success('Izoh qo‘shildi'); void queryClient.invalidateQueries({ queryKey: ['startup', id] }); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Izohni qo‘shib bo‘lmadi'),
  });
  const archiveMutation = useMutation({
    mutationFn: () => apiFetch(`/startups/${id}/archive`, { method: 'POST' }),
    onSuccess: () => { toast.success('Startap arxivlandi'); router.push('/startups'); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Arxivlab bo‘lmadi'),
  });
  const restoreMutation = useMutation({
    mutationFn: () => apiFetch(`/startups/${id}/restore`, { method: 'POST' }),
    onSuccess: () => { toast.success('Startap qayta faollashtirildi'); void queryClient.invalidateQueries({ queryKey: ['startup', id] }); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Startapni tiklab bo‘lmadi'),
  });

  if (isLoading || !data) return <PageLoader />;
  const canEdit = user?.role !== 'VIEWER' && data.status !== 'ARCHIVED';
  const canArchive = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  return (
    <>
      <div className="detail-header">
        <div className="detail-identity">
          <div className="startup-logo avatar-lg">{data.logoUrl ? <img src={data.logoUrl} alt="" /> : initials(data.name)}</div>
          <div>
            <h2>{data.name}</h2>
            <div className="detail-badges"><StageBadge name={data.currentStage.name} color={data.currentStage.color} /><StatusBadge status={data.status} /></div>
          </div>
        </div>
        <div className="detail-actions">
          {canArchive && data.status !== 'ARCHIVED' && (
            <button className="button button-danger" onClick={() => window.confirm('Startapni arxivlamoqchimisiz?') && archiveMutation.mutate()}><Archive size={16} /> Arxivlash</button>
          )}
          {canArchive && data.status === 'ARCHIVED' && (
            <button className="button button-secondary" disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate()}><RotateCcw size={16} /> Tiklash</button>
          )}
          {canEdit && <Link href={`/startups/${id}/edit`} className="button button-primary"><Pencil size={16} /> Tahrirlash</Link>}
        </div>
      </div>

      <div className="detail-grid">
        <section className="card">
          <div className="tabs">
            {([['overview', 'Umumiy'], ['finance', 'Moliya'], ['milestones', 'Vazifalar'], ['team', `Jamoa (${data.members?.length || 0})`], ['timeline', 'Bosqichlar tarixi'], ['notes', `Izohlar (${data.notes?.length || 0})`]] as [Tab, string][]).map(([value, label]) => (
              <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}</button>
            ))}
          </div>

          {tab === 'overview' && (
            <>
              <div className="overview-section"><h3>Startap haqida</h3><p>{data.description || 'Startap haqida tavsif kiritilmagan.'}</p></div>
              <div className="overview-section"><h3>Muammo</h3><p>{data.problem || 'Muammo ta’rifi kiritilmagan.'}</p></div>
              <div className="overview-section"><h3>Taklif qilinayotgan yechim</h3><p>{data.solution || 'Yechim ta’rifi kiritilmagan.'}</p></div>
              <div className="overview-section">
                <h3>Asosiy ma’lumotlar</h3>
                <div className="info-grid">
                  <div className="info-item"><span>Yo‘nalish</span><strong>{data.industry || '—'}</strong></div>
                  <div className="info-item"><span>Joylashuv</span><strong>{data.location || '—'}</strong></div>
                  <div className="info-item"><span>Jamoa soni</span><strong>{data.teamSize || data.members?.length || '—'}</strong></div>
                  <div className="info-item"><span>Tashkil topgan</span><strong>{formatDate(data.foundedAt)}</strong></div>
                  <div className="info-item"><span>Klubga qo‘shilgan</span><strong>{formatDate(data.joinedAt)}</strong></div>
                  <div className="info-item"><span>Yangilangan</span><strong>{formatDate(data.updatedAt, true)}</strong></div>
                  <div className="info-item"><span>Veb-sayt</span>{data.website ? <a href={data.website} target="_blank" rel="noreferrer">Saytni ochish <ExternalLink size={11} /></a> : <strong>—</strong>}</div>
                  <div className="info-item"><span>Pitch deck</span>{data.pitchDeckUrl ? <a href={data.pitchDeckUrl} target="_blank" rel="noreferrer">Hujjatni ochish <ExternalLink size={11} /></a> : <strong>—</strong>}</div>
                </div>
              </div>
            </>
          )}

          {tab === 'finance' && <FinancePanel startupId={id} canEdit={canEdit} canDelete={canArchive} />}
          {tab === 'milestones' && <MilestonePanel startupId={id} canEdit={canEdit} canDelete={canArchive} />}

          {tab === 'team' && (
            data.members?.length ? <div className="team-list">{data.members.map((member, index) => (
              <article className="team-card" key={member.id || index}>
                <span className="avatar">{initials(member.fullName)}</span>
                <div><strong>{member.fullName}</strong><span>{member.role || (member.isFounder ? 'Asoschi' : 'Jamoa a’zosi')}</span>{member.email && <span>{member.email}</span>}</div>
              </article>
            ))}</div> : <div className="empty-state"><Users size={25} /><h3>Jamoa kiritilmagan</h3><p>Tahrirlash orqali jamoa a’zolarini qo‘shing.</p></div>
          )}

          {tab === 'timeline' && (
            <div className="overview-section timeline">
              {data.stageHistory?.length ? data.stageHistory.map((item) => (
                <div className="timeline-item" key={item.id}>
                  <span className="timeline-dot" style={{ '--stage-color': item.toStage.color } as React.CSSProperties} />
                  <div>
                    <p>{item.fromStage ? <><strong>{item.fromStage.name}</strong> bosqichidan </> : 'Startap '}<strong>{item.toStage.name}</strong> bosqichiga o‘tdi</p>
                    {item.note && <small>{item.note}</small>}
                    <small>{item.changedBy.fullName} · {formatDate(item.createdAt, true)}</small>
                  </div>
                </div>
              )) : <p>Tarix mavjud emas.</p>}
            </div>
          )}

          {tab === 'notes' && (
            <>
              {canEdit && <div className="note-form">
                <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ichki izoh yozing..." />
                <div className="note-form-actions"><button className="button button-primary" disabled={!note.trim() || noteMutation.isPending} onClick={() => noteMutation.mutate()}><Send size={14} /> Izoh qo‘shish</button></div>
              </div>}
              <div className="notes-list">
                {data.notes?.length ? data.notes.map((item) => (
                  <div className="note-item" key={item.id}>
                    <span className="avatar avatar-sm">{initials(item.author.fullName)}</span>
                    <div><div className="note-meta"><strong>{item.author.fullName}</strong><time>{formatDate(item.createdAt, true)}</time></div><p>{item.content}</p></div>
                  </div>
                )) : <div className="empty-state"><Send size={22} /><h3>Izohlar yo‘q</h3><p>Bu startap bo‘yicha birinchi ichki izohni yozing.</p></div>}
              </div>
            </>
          )}
        </section>

        <aside>
          <div className="card side-card">
            <h3>Joriy bosqich</h3>
            <select className="stage-select-big" value={data.currentStageId} disabled={!canEdit || stageMutation.isPending} onChange={(event) => stageMutation.mutate(event.target.value)}>
              {stages.filter((stage) => stage.isActive).map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
            </select>
          </div>
          <div className="card side-card">
            <h3>Biriktirilgan kurator</h3>
            {data.curator ? <div className="curator-card"><span className="avatar">{initials(data.curator.fullName)}</span><div><strong>{data.curator.fullName}</strong><span>{data.curator.email || 'Kurator'}</span></div></div> : <p className="muted" style={{ fontSize: 10 }}>Kurator biriktirilmagan</p>}
          </div>
          <div className="card side-card">
            <h3>Aloqa ma’lumotlari</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <div className="person-cell"><Mail size={14} color="#83928d" /><span>{data.email || 'Kiritilmagan'}</span></div>
              <div className="person-cell"><Phone size={14} color="#83928d" /><span>{data.phone || 'Kiritilmagan'}</span></div>
              <div className="person-cell"><Globe size={14} color="#83928d" /><span>{data.website ? data.website.replace(/^https?:\/\//, '') : 'Kiritilmagan'}</span></div>
              <div className="person-cell"><MapPin size={14} color="#83928d" /><span>{data.location || 'Kiritilmagan'}</span></div>
            </div>
          </div>
          <div className="card side-card">
            <h3>Qisqa statistika</h3>
            <div className="info-grid">
              <div className="info-item"><span>Jamoa</span><strong>{data.members?.length || data.teamSize || 0}</strong></div>
              <div className="info-item"><span>Izohlar</span><strong>{data.notes?.length || 0}</strong></div>
              <div className="info-item"><span>Bosqich o‘tishlari</span><strong>{data.stageHistory?.length || 0}</strong></div>
              <div className="info-item"><span>Holat</span><strong>{statusLabels[data.status]}</strong></div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
