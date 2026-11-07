'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GripVertical, Info, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { initials } from '@/lib/format';
import { Stage, Startup } from '@/lib/types';
import { ErrorState, PageLoader, StatusBadge } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

interface PipelineStage extends Stage { startups: Startup[] }

const PIPELINE_KEY = ['pipeline'];

export default function PipelinePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: PIPELINE_KEY,
    queryFn: () => apiFetch<PipelineStage[]>('/startups/pipeline'),
  });
  const mutation = useMutation({
    mutationFn: ({ startupId, stageId }: { startupId: string; stageId: string }) =>
      apiFetch(`/startups/${startupId}/stage`, { method: 'POST', body: JSON.stringify({ stageId }) }),
    // Karta darhol yangi ustunga o‘tadi; server rad etsa, avvalgi holat qaytariladi
    onMutate: async ({ startupId, stageId }) => {
      setMovingId(startupId);
      await queryClient.cancelQueries({ queryKey: PIPELINE_KEY });
      const previous = queryClient.getQueryData<PipelineStage[]>(PIPELINE_KEY);
      if (previous) {
        const moved = previous.flatMap((stage) => stage.startups).find((item) => item.id === startupId);
        if (moved) {
          queryClient.setQueryData<PipelineStage[]>(PIPELINE_KEY, previous.map((stage) => ({
            ...stage,
            startups: stage.id === stageId
              ? [{ ...moved, currentStageId: stageId }, ...stage.startups.filter((item) => item.id !== startupId)]
              : stage.startups.filter((item) => item.id !== startupId),
          })));
        }
      }
      return { previous };
    },
    onSuccess: () => toast.success('Startap bosqichi yangilandi'),
    onError: (mutationError, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(PIPELINE_KEY, context.previous);
      toast.error(mutationError instanceof Error ? mutationError.message : 'Bosqichni yangilab bo‘lmadi');
    },
    onSettled: (_data, _error, variables) => {
      setMovingId(null);
      void queryClient.invalidateQueries({ queryKey: PIPELINE_KEY });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['startups'] });
      void queryClient.invalidateQueries({ queryKey: ['startup', variables.startupId] });
    },
  });

  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const canEdit = user?.role !== 'VIEWER';

  return (
    <>
      <div className="pipeline-tip">
        <Info size={15} />
        {canEdit
          ? 'Kartalarni ustunlar orasida sudrab, startap bosqichini yangilang. Telefonda karta ostidagi ro‘yxatdan bosqichni tanlang.'
          : 'Sizda kuzatuvchi huquqi bor; pipeline faqat ko‘rish rejimida.'}
      </div>
      <div className="pipeline-wrap">
        <div className="pipeline">
          {data.map((stage) => (
            <section
              className={`pipeline-column ${dragOver === stage.id ? 'drag-over' : ''}`}
              key={stage.id}
              aria-label={`${stage.name} bosqichi`}
              onDragOver={(event) => {
                if (!canEdit) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                if (dragOver !== stage.id) setDragOver(stage.id);
              }}
              onDragLeave={(event) => {
                // Ichki elementlarga o‘tganda ham dragleave keladi — faqat ustundan chiqqanda tozalaymiz
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(null);
                if (!canEdit || mutation.isPending) return;
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
                  <div className="pipeline-card-wrap" key={startup.id}>
                  <Link
                    href={`/startups/${startup.id}`}
                    className={`pipeline-card ${movingId === startup.id ? 'is-moving' : ''}`}
                    draggable={canEdit}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('startupId', startup.id);
                      event.dataTransfer.setData('stageId', stage.id);
                    }}
                    onDragEnd={() => setDragOver(null)}
                  >
                    <div className="pipeline-card-top">
                      <div className="startup-logo">{startup.logoUrl ? <img src={startup.logoUrl} alt="" /> : initials(startup.name)}</div>
                      <div style={{ minWidth: 0, flex: 1 }}><h3>{startup.name}</h3><span className="muted" style={{ fontSize: 12 }}>{startup.industry || 'Yo‘nalishsiz'}</span></div>
                      {canEdit && <GripVertical size={15} color="#9aaba5" aria-hidden="true" />}
                    </div>
                    <p>{startup.description?.slice(0, 90) || 'Tavsif kiritilmagan.'}{(startup.description?.length || 0) > 90 ? '…' : ''}</p>
                    <StatusBadge status={startup.status} />
                    <div className="pipeline-card-bottom">
                      <span><MapPin size={12} /> {startup.location || '—'}</span>
                      <span><Users size={12} /> {startup._count?.members || startup.teamSize || 0}</span>
                    </div>
                  </Link>
                  {/* Sensorli ekranda sudrash ishlamaydi — bosqich shu ro‘yxatdan tanlanadi */}
                  {canEdit && (
                    <label className="pipeline-move">
                      <span>Bosqichga o‘tkazish</span>
                      <select
                        value={stage.id}
                        disabled={mutation.isPending}
                        aria-label={`${startup.name} bosqichini o‘zgartirish`}
                        onChange={(event) => {
                          if (event.target.value !== stage.id) mutation.mutate({ startupId: startup.id, stageId: event.target.value });
                        }}
                      >
                        {data.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                      </select>
                    </label>
                  )}
                  </div>
                ))}
                {!stage.startups.length && (
                  <p className="pipeline-empty">Startap yo‘q{canEdit && <span className="drop-hint"> — kartani shu yerga tashlang</span>}</p>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
