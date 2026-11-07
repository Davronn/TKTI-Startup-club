'use client';

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CreditCard, Percent, ReceiptText, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { CashNav } from '@/components/cash/cash-nav';
import { CashEmpty, CategoryBars, MonthlyChart, ReceiptViewer, TxRow } from '@/components/cash/cash-parts';
import { useCashData } from '@/components/cash/cash-data';
import { ErrorState, PageLoader } from '@/components/ui';
import {
  CashTransaction,
  categoryTotals,
  currentMonth,
  fmt,
  isCardOut,
  lastMonths,
  money,
  monthEnd,
  monthName,
  MONTHS_SHORT,
  periodData,
  sortDesc,
} from '@/lib/cash';

export default function CashHomePage() {
  const { loading, error, retry, rows, settings, canWrite } = useCashData();
  const [receipt, setReceipt] = useState<CashTransaction | null>(null);
  if (loading) return <PageLoader />;
  if (error) return <><CashNav canWrite={canWrite} /><ErrorState error={error} onRetry={retry} /></>;

  const month = currentMonth();
  const all = periodData(rows, settings);
  const thisMonth = periodData(rows, settings, `${month}-01`, monthEnd(month));
  const outs = rows.filter((r) => r.kind === 'OUT');
  const withReceipt = outs.filter((r) => r.receipt).length;
  const receiptPct = outs.length ? Math.round((withReceipt / outs.length) * 100) : null;
  const cats = categoryTotals(thisMonth.list, 'OUT').slice(0, 5);
  const recent = [...rows].sort(sortDesc).slice(0, 5);
  const pending = rows.filter((r) => isCardOut(r) && !r.usage);
  const ms = MONTHS_SHORT[Number(month.slice(5)) - 1];

  return (
    <>
      <CashNav canWrite={canWrite} />
      <section className="cash-hero">
        <div>
          <span className="cash-hero-label">Joriy balans · {settings.unitName}</span>
          <div className="cash-hero-value">{money(all.closeTotal)}<small>so‘m</small></div>
          <div className="cash-hero-split">
            <span><Wallet size={15} /> Naqd: {money(all.close.CASH)}</span>
            <span><CreditCard size={15} /> Karta: {money(all.close.CARD)}</span>
          </div>
        </div>
        {canWrite && (
          <div className="cash-hero-actions">
            <Link className="cash-hero-button" href="/kassa/yangi?tur=OUT"><ArrowUpRight size={17} />Chiqim</Link>
            <Link className="cash-hero-button alt" href="/kassa/yangi?tur=IN"><ArrowDownLeft size={17} />Kirim</Link>
            <Link className="cash-hero-button alt" href="/kassa/yangi?tur=MOVE"><ArrowLeftRight size={17} />O‘tkazma</Link>
          </div>
        )}
      </section>

      {pending.length > 0 && (
        <section className="cash-notice">
          <span className="cash-kpi-icon orange"><CreditCard size={18} /></span>
          <div><b>{pending.length} ta karta o‘tkazmasi bo‘yicha hisobot yo‘q</b><span>O‘tkazilgan pul nimaga ishlatilganini yozib qo‘ysangiz, hisobot to‘liq bo‘ladi.</span></div>
          <Link className="button button-secondary" href="/kassa/jurnal?tur=card">Ko‘rish</Link>
        </section>
      )}

      <section className="cash-kpis" aria-label="Ko‘rsatkichlar">
        <div className="card cash-kpi"><div className="cash-kpi-top"><span className="cash-kpi-icon green"><ArrowDownLeft size={17} /></span>Kirim · {ms}</div><b className="cash-in">{fmt(thisMonth.inSum)}<small>so‘m</small></b></div>
        <div className="card cash-kpi"><div className="cash-kpi-top"><span className="cash-kpi-icon red"><ArrowUpRight size={17} /></span>Chiqim · {ms}</div><b className="cash-out">{fmt(thisMonth.outSum)}<small>so‘m</small></b></div>
        <div className="card cash-kpi"><div className="cash-kpi-top"><span className="cash-kpi-icon blue"><Percent size={17} /></span>Komissiya · {ms}</div><b>{fmt(thisMonth.commissionSum)}<small>so‘m</small></b></div>
        <div className="card cash-kpi">
          <div className="cash-kpi-top"><span className="cash-kpi-icon yellow"><ReceiptText size={17} /></span>Chekli chiqimlar</div>
          <b>{receiptPct === null ? '—' : `${receiptPct}%`}</b>
          <div className="cash-meter"><i style={{ width: `${receiptPct ?? 0}%` }} /></div>
          <span className="muted">{outs.length ? `${withReceipt} / ${outs.length} ta chiqimda` : 'Chiqim yo‘q'}</span>
        </div>
      </section>

      <div className="cash-grid-2">
        <section className="card">
          <div className="card-header"><h2>So‘nggi 6 oy</h2><div className="cash-legend"><span><i style={{ background: 'var(--cash-in)' }} />Kirim</span><span><i style={{ background: 'var(--cash-out)' }} />Chiqim</span></div></div>
          <div className="card-body"><MonthlyChart rows={rows} months={lastMonths(6)} /></div>
        </section>
        <section className="card">
          <div className="card-header"><h2>Bu oy qayerga ketdi</h2><Link className="text-link" href="/kassa/hisobotlar">Hisobot →</Link></div>
          <div className="card-body">
            {cats.length ? <CategoryBars items={cats} total={thisMonth.outSum} /> : <p className="muted">{monthName(month)} uchun chiqimlar hali yo‘q.</p>}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-header"><h2>So‘nggi yozuvlar</h2>{rows.length > 0 && <Link className="text-link" href="/kassa/jurnal">Hammasi →</Link>}</div>
        {recent.length ? (
          <div className="cash-list">{recent.map((r) => <TxRow key={r.id} row={r} compact onOpenReceipt={setReceipt} />)}</div>
        ) : (
          <CashEmpty
            title="Hali yozuv yo‘q"
            text="Birinchi kirim yoki chiqimni qo‘shing. Avval Sozlamalarda boshlang‘ich qoldiqni kiritib qo‘ying."
            action={canWrite ? <div className="cash-inline-actions"><Link className="button button-primary" href="/kassa/yangi">Yozuv qo‘shish</Link><Link className="button button-secondary" href="/kassa/sozlamalar">Sozlamalar</Link></div> : null}
          />
        )}
      </section>
      <ReceiptViewer row={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}
