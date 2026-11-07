'use client';

import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { StartupForm } from '@/components/startup-form';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { Startup } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

export default function EditStartupPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['startup', id], queryFn: () => apiFetch<Startup>(`/startups/${id}`) });
  if (isLoading) return <PageLoader />;
  if (error || !data) {
    return <ErrorState error={error} onRetry={() => void refetch()} action={<Link href="/startups" className="button button-secondary">Startaplar ro‘yxatiga</Link>} />;
  }
  if (user?.role === 'VIEWER' || data.status === 'ARCHIVED') {
    return (
      <div className="card">
        <EmptyState
          icon={<Lock size={23} />}
          title={data.status === 'ARCHIVED' ? 'Startap arxivda' : 'Faqat ko‘rish huquqi'}
          description={data.status === 'ARCHIVED' ? 'Tahrirlash uchun avval startapni arxivdan tiklang.' : 'Tahrirlash uchun menejer yoki administrator huquqi kerak.'}
          action={<Link href={`/startups/${id}`} className="button button-secondary">Profilga qaytish</Link>}
        />
      </div>
    );
  }
  return <StartupForm initial={data} />;
}
