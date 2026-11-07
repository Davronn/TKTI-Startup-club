'use client';

import { useEffect, useState } from 'react';
import { CashNav } from '@/components/cash/cash-nav';
import { CashEmpty } from '@/components/cash/cash-parts';
import { useCashData } from '@/components/cash/cash-data';
import { CashEntryForm } from '@/components/cash/entry-form';
import { ErrorState, PageLoader } from '@/components/ui';
import { CashKind } from '@/lib/cash';

export default function NewCashEntryPage() {
  const { loading, error, retry, rows, all, settings, canWrite } = useCashData();
  // ?tur=IN|OUT|MOVE — bosh sahifadagi tugmalardan keladi (useSearchParams'siz, statik sahifa uchun)
  const [kind, setKind] = useState<CashKind | null>(null);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('tur');
    setKind(value === 'IN' || value === 'MOVE' ? value : 'OUT');
  }, []);
  if (loading || !kind) return <PageLoader />;
  if (error) return <><CashNav canWrite={canWrite} /><ErrorState error={error} onRetry={retry} /></>;
  return (
    <>
      <CashNav canWrite={canWrite} />
      {canWrite ? (
        <CashEntryForm key={kind} rows={rows} all={all} settings={settings} startKind={kind} />
      ) : (
        <div className="card"><CashEmpty title="Faqat ko‘rish huquqi" text="Yozuv qo‘shish uchun administratordan menejer huquqini so‘rang." /></div>
      )}
    </>
  );
}
