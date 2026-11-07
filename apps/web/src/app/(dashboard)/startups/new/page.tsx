'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { StartupForm } from '@/components/startup-form';
import { EmptyState } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

export default function NewStartupPage() {
  const { user } = useAuth();
  if (user?.role === 'VIEWER') {
    return (
      <div className="card">
        <EmptyState
          icon={<Lock size={23} />}
          title="Faqat ko‘rish huquqi"
          description="Startap qo‘shish uchun menejer yoki administrator huquqi kerak."
          action={<Link href="/startups" className="button button-secondary">Startaplar ro‘yxatiga</Link>}
        />
      </div>
    );
  }
  return <StartupForm />;
}
