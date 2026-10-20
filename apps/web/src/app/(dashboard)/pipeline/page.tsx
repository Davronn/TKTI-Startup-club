'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GripVertical, Info, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { initials } from '@/lib/format';
import { Stage, Startup } from '@/lib/types';
import { PageLoader, StatusBadge } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

interface PipelineStage extends Stage { startups: Startup[] }

export default function PipelinePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [dragOver, setDragOver] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['pipeline'],
    queryFn: () => apiFetch<PipelineStage[]>('/startups/pipeline'),
  });
  const mutation = useMutation({
    mutationFn: ({ startupId, stageId }: { startupId: string; stageId: string }) =>
      apiFetch(`/startups/${startupId}/stage`, { method: 'POST', body: JSON.stringify({ stageId }) }),
    onSuccess: () => {
      toast.success('Startap bosqichi yangilandi');
      void queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Bosqichni yangilab bo‘lmadi'),
  });

  if (isLoading) return <PageLoader />;
  const canEdit = user?.role !== 'VIEWER';

  return (
    <>
      <div className="pipeline-tip">
        <Info size={15} />
        {canEdit ? 'Kartalarni ustunlar orasida ko‘chirish orqali startap bosqichini yangilang.' : 'Sizda kuzatuvchi huquqi bor; pipeline faqat ko‘rish rejimida.'}
      </div>
      <div className="pipeline-wrap">
        <div className="pipeline">
          {data?.map((stage) => (
            <section
              className={`pipeline-column ${dragOver === stage.id ? 'drag-over' : ''}`}
              key={stage.id}
              onDragOver={(event) => { if (canEdit) { event.preventDefault(); setDragOver(stage.id); } }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(null);
                const startupId = event.dataTransfer.getData('startupId');
                const fromStageId = event.dataTransfer.getData('stageId');
                if (startupId && fromStageId !== stage.id) mutation.mutate({ startupId, stageId: stage.id });
              }}
            >
              <div className="pipeline-head">
                <div className="pipeline-title"><i style={{ '--stage-color': stage.color } as React.CSSProperties} /><strong>{stage.name}</strong></div>
                <span className="pipeline-count">{stage.startups.length}</span>
              </div>
              <div className="pipeline-cards">
                {stage.startups.map((startup) => (
                  <Link
                    href={`/startups/${startup.id}`}
                    className="pipeline-card"
                    key={startup.id}
                    draggable={canEdit}
                    onDragStart={(event) => {
                      event.dataTransfer.setData('startupId', startup.id);
                      event.dataTransfer.setData('stageId', stage.id);
                    }}
                  >
                    <div className="pipeline-card-top">
                      <div className="startup-logo">{initials(startup.name)}</div>
                      <div style={{ minWidth: 0, flex: 1 }}><h3>{startup.name}</h3><span className="muted" style={{ fontSize: 9 }}>{startup.industry || 'Yo‘nalishsiz'}</span></div>
                      {canEdit && <GripVertical size={15} color="#9aaba5" />}
                    </div>
                    <p>{startup.description?.slice(0, 90) || 'Tavsif kiritilmagan.'}{(startup.description?.length || 0) > 90 ? '…' : ''}</p>
                    <StatusBadge status={startup.status} />
                    <div className="pipeline-card-bottom">
                      <span><MapPin size={12} /> {startup.location || '—'}</span>
                      <span><Users size={12} /> {startup._count?.members || startup.teamSize || 0}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
