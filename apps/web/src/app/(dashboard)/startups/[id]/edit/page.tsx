'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { StartupForm } from '@/components/startup-form';
import { PageLoader } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { Startup } from '@/lib/types';

export default function EditStartupPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({ queryKey: ['startup', id], queryFn: () => apiFetch<Startup>(`/startups/${id}`) });
  if (isLoading || !data) return <PageLoader />;
  return <StartupForm initial={data} />;
}
