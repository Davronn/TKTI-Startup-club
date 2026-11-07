'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CashNav } from '@/components/cash/cash-nav';
import { CashEmpty } from '@/components/cash/cash-parts';
import { useCashData } from '@/components/cash/cash-data';
import { CashEntryForm } from '@/components/cash/entry-form';
import { ErrorState, PageLoader } from '@/components/ui';

export default function EditCashEntryPage() {
  const { id } = useParams<{ id: string }>();
  const { loading, error, retry, rows, all, settings, canWrite } = useCashData();
  if (loading) return <PageLoader />;
  if (error) return <><CashNav canWrite={canWrite} /><ErrorState error={error} onRetry={retry} /></>;
  const row = all.find((item) => item.id === id);
  return (
    <>
      <CashNav canWrite={canWrite} />
      {!row ? (
        <div className="card"><CashEmpty title="Yozuv topilmadi" text="U o‘chirilgan yoki boshqa tashkilotga tegishli bo‘lishi mumkin." action={<Link className="button button-secondary" href="/kassa/jurnal">Jurnalga qaytish</Link>} /></div>
      ) : row.archivedAt ? (
        <div className="card"><CashEmpty title="Yozuv arxivda" text="Tahrirlash uchun avval Sozlamalar → Arxiv bo‘limida tiklang." action={<Link className="button button-secondary" href="/kassa/sozlamalar">Arxivga o‘tish</Link>} /></div>
      ) : !canWrite ? (
        <div className="card"><CashEmpty title="Faqat ko‘rish huquqi" text="Tahrirlash uchun menejer huquqi kerak." /></div>
      ) : (
        <CashEntryForm key={row.id} rows={rows} all={all} settings={settings} editing={row} />
      )}
    </>
  );
}
