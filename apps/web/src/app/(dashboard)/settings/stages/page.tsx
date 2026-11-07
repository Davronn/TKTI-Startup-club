'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Stage } from '@/lib/types';
import { ErrorState, PageLoader } from '@/components/ui';
import { NotificationsCard } from '@/components/notifications-card';

/** Rang tanlagich surilganda har kadrda so‘rov ketmasligi uchun: tanlash to‘xtagach bir marta saqlanadi. */
function StageColorInput({ stage, onSave }: { stage: Stage; onSave: (color: string) => void }) {
  const [value, setValue] = useState(stage.color);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setValue(stage.color), [stage.color]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <input
      className="color-input"
      type="color"
      aria-label={`${stage.name} rangi`}
      value={value}
      onChange={(event) => {
        const next = event.target.value;
        setValue(next);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => { if (next.toLowerCase() !== stage.color.toLowerCase()) onSave(next); }, 600);
      }}
    />
  );
}

export default function StageSettingsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#0969C8');
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ['stages'], queryFn: () => apiFetch<Stage[]>('/stages') });
  const refreshAll = () => Promise.all(['stages', 'pipeline', 'dashboard'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
  const createMutation = useMutation({
    mutationFn: () => apiFetch('/stages', { method: 'POST', body: JSON.stringify({ name: name.trim(), color }) }),
    onSuccess: () => { setName(''); toast.success('Yangi bosqich qo‘shildi'); void refreshAll(); },
    onError: (mutationError) => toast.error(mutationError instanceof Error ? mutationError.message : 'Bosqichni qo‘shib bo‘lmadi'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => apiFetch(`/stages/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: () => { toast.success('Bosqich yangilandi'); void refreshAll(); },
    onError: (mutationError) => toast.error(mutationError instanceof Error ? mutationError.message : 'Bosqichni yangilab bo‘lmadi'),
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  function submit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) { toast.error('Bosqich nomi kamida 2 ta belgi bo‘lsin'); return; }
    createMutation.mutate();
  }

  return (
    <div style={{ maxWidth: 850 }}>
      <form className="card" onSubmit={submit} style={{ padding: 18, marginBottom: 18 }}>
        <div className="inline-form">
          <label className="form-field"><span>Yangi bosqich nomi</span><input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} placeholder="Masalan: Investitsiya" /></label>
          <label className="form-field"><span>Rang</span><input className="color-input" type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label>
          <button className="button button-primary" disabled={createMutation.isPending}><Plus size={16} /> {createMutation.isPending ? 'Qo‘shilmoqda...' : 'Qo‘shish'}</button>
        </div>
      </form>

      <section className="card">
        <div className="card-header"><div><h2>Pipeline bosqichlari</h2><p>Rang va ko‘rinishni boshqaring. Yashirilgan bosqich yangi startaplar uchun tanlanmaydi.</p></div></div>
        <div className="stage-settings-list">
          {data.map((stage, index) => (
            <div className={`stage-setting-row ${!stage.isActive ? 'inactive' : ''}`} key={stage.id}>
              <span className="stage-number">{index + 1}</span>
              <div className="stage-setting-info"><strong>{stage.name}</strong><span>{stage._count?.startups || 0} ta startap</span></div>
              <StageColorInput stage={stage} onSave={(next) => updateMutation.mutate({ id: stage.id, payload: { color: next } })} />
              <select
                className="select-control"
                aria-label={`${stage.name} holati`}
                value={stage.isActive ? 'active' : 'inactive'}
                disabled={updateMutation.isPending}
                onChange={(event) => updateMutation.mutate({ id: stage.id, payload: { isActive: event.target.value === 'active' } })}
              >
                <option value="active">Faol</option><option value="inactive">Yashirilgan</option>
              </select>
            </div>
          ))}
        </div>
      </section>

      <NotificationsCard />
    </div>
  );
}
