'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Stage } from '@/lib/types';
import { PageLoader } from '@/components/ui';

export default function StageSettingsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#0F8F67');
  const { data = [], isLoading } = useQuery({ queryKey: ['stages'], queryFn: () => apiFetch<Stage[]>('/stages') });
  const createMutation = useMutation({
    mutationFn: () => apiFetch('/stages', { method: 'POST', body: JSON.stringify({ name, color }) }),
    onSuccess: () => { setName(''); toast.success('Yangi bosqich qo‘shildi'); void queryClient.invalidateQueries({ queryKey: ['stages'] }); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Bosqichni qo‘shib bo‘lmadi'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => apiFetch(`/stages/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: () => { toast.success('Bosqich yangilandi'); void queryClient.invalidateQueries({ queryKey: ['stages'] }); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Bosqichni yangilab bo‘lmadi'),
  });

  if (isLoading) return <PageLoader />;
  function submit(event: FormEvent) { event.preventDefault(); createMutation.mutate(); }

  return (
    <div style={{ maxWidth: 850 }}>
      <form className="card" onSubmit={submit} style={{ padding: 18, marginBottom: 18 }}>
        <div className="inline-form">
          <label className="form-field"><span>Yangi bosqich nomi</span><input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} placeholder="Masalan: Investitsiya" /></label>
          <label className="form-field"><span>Rang</span><input className="color-input" type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label>
          <button className="button button-primary" disabled={createMutation.isPending}><Plus size={16} /> Qo‘shish</button>
        </div>
      </form>

      <section className="card">
        <div className="card-header"><div><h2>Pipeline bosqichlari</h2><p>Tartib va ko‘rinishni boshqaring. Ichida startap bo‘lgan bosqich o‘chirilmaydi.</p></div></div>
        <div className="stage-settings-list">
          {data.map((stage, index) => (
            <div className={`stage-setting-row ${!stage.isActive ? 'inactive' : ''}`} key={stage.id}>
              <span className="stage-number">{index + 1}</span>
              <div className="stage-setting-info"><strong>{stage.name}</strong><span>{stage._count?.startups || 0} ta startap</span></div>
              <input className="color-input" type="color" value={stage.color} onChange={(event) => updateMutation.mutate({ id: stage.id, payload: { color: event.target.value } })} />
              <select className="select-control" value={stage.isActive ? 'active' : 'inactive'} onChange={(event) => updateMutation.mutate({ id: stage.id, payload: { isActive: event.target.value === 'active' } })}><option value="active">Faol</option><option value="inactive">Yashirilgan</option></select>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
