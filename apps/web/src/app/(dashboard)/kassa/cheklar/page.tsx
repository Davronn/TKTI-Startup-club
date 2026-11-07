'use client';

import { Camera } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { CashNav } from '@/components/cash/cash-nav';
import { CashEmpty, CategoryIcon, ReceiptViewer } from '@/components/cash/cash-parts';
import { useCashData } from '@/components/cash/cash-data';
import { ErrorState, PageLoader } from '@/components/ui';
import { CashTransaction, categoryMeta, categoryOf, dayName, docLabel, fmt, receiptUrl, shownAmount, sortDesc, titleOf } from '@/lib/cash';

export default function CashReceiptsPage() {
  const { loading, error, retry, rows, canWrite } = useCashData();
  const [receipt, setReceipt] = useState<CashTransaction | null>(null);
  if (loading) return <PageLoader />;
  if (error) return <><CashNav canWrite={canWrite} /><ErrorState error={error} onRetry={retry} /></>;
  const withReceipt = rows.filter((r) => r.receipt).sort(sortDesc);
  const missing = rows.filter((r) => r.kind === 'OUT' && !r.receipt).sort(sortDesc);

  return (
    <>
      <CashNav canWrite={canWrite} />
      <section className="card cash-section">
        <div className="card-header"><h2>Biriktirilgan cheklar</h2><span className="muted">{withReceipt.length} ta</span></div>
        {withReceipt.length ? (
          <div className="cash-gallery">
            {withReceipt.map((r) => (
              <button key={r.id} type="button" className="cash-receipt-card" style={{ '--c': categoryMeta(categoryOf(r)).color } as React.CSSProperties} onClick={() => setReceipt(r)} aria-label={`Chek: ${titleOf(r)}`}>
                <div className="cash-receipt-image">
                  {r.receipt!.mimeType === 'application/pdf'
                    ? <span className="cash-pdf-badge large">PDF</span>
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img loading="lazy" alt="" src={receiptUrl(r.receipt!.id)} />}
                </div>
                <div className="cash-receipt-body">
                  <b className={r.kind === 'IN' ? 'cash-in' : r.kind === 'OUT' ? 'cash-out' : 'cash-move'}>{r.kind === 'IN' ? '+' : r.kind === 'OUT' ? '−' : '⇄ '}{fmt(shownAmount(r))} so‘m</b>
                  <span>{titleOf(r)}</span>
                  <small>{docLabel(r)} · {dayName(r.date)}</small>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <CashEmpty title="Hali chek yo‘q" text="Yozuv qo‘shayotganda chek, kvitansiya yoki o‘tkazma skrinshotini biriktirsangiz, ular shu yerda yig‘iladi." />
        )}
      </section>
      <section className="card">
        <div className="card-header"><h2>Cheki yo‘q xarajatlar</h2><span className="muted">{missing.length} ta</span></div>
        {missing.length ? (
          <div className="cash-list">
            {missing.map((r) => (
              <div key={r.id} className="cash-row" style={{ '--c': categoryMeta(r.category).color } as React.CSSProperties}>
                <CategoryIcon name={r.category} size={19} large />
                <div className="cash-row-main">
                  <strong>{r.note}</strong>
                  <div className="cash-row-meta"><span className="cash-doc">{docLabel(r)}</span><span className="cash-row-cat">{r.category}</span><span>{dayName(r.date)}</span><span className="cash-out">−{fmt(shownAmount(r))}</span></div>
                </div>
                {canWrite ? <Link className="button button-secondary" href={`/kassa/yozuv/${r.id}`}><Camera size={15} />Chek qo‘shish</Link> : <span />}
              </div>
            ))}
          </div>
        ) : (
          <div className="card-body muted">{rows.length ? 'Barcha xarajatlarda chek bor. Ajoyib!' : 'Xarajatlar qo‘shilgach, cheki yo‘qlari shu yerda ko‘rinadi.'}</div>
        )}
      </section>
      <ReceiptViewer row={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}
