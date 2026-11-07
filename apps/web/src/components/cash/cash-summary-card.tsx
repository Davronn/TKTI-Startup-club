'use client';

import { ArrowDownLeft, ArrowRight, ArrowUpRight, CreditCard, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useCashData } from '@/components/cash/cash-data';
import { currentMonth, fmt, isCardOut, money, monthEnd, MONTHS_SHORT, periodData } from '@/lib/cash';

/** Boshqaruv panelidagi qisqa kassa holati. Kassa sahifalari bilan bir xil kesh va hisob-kitobdan foydalanadi. */
export function CashSummaryCard() {
  const { loading, error, rows, settings, canWrite } = useCashData();

  return (
    <article className="card">
      <div className="card-header">
        <div><h2>Bo‘lim kassasi</h2><p>Joriy qoldiq va shu oy harakati</p></div>
        <Link href="/kassa" className="text-link">Kassa <ArrowRight size={13} /></Link>
      </div>
      <div className="card-body cash-summary">
        {loading ? (
          <p className="muted">Yuklanmoqda...</p>
        ) : error ? (
          <p className="muted">Kassa ma’lumotlarini yuklab bo‘lmadi.</p>
        ) : (
          <CashSummaryBody rows={rows} settings={settings} canWrite={canWrite} />
        )}
      </div>
    </article>
  );
}

function CashSummaryBody({ rows, settings, canWrite }: Pick<ReturnType<typeof useCashData>, 'rows' | 'settings' | 'canWrite'>) {
  const month = currentMonth();
  const all = periodData(rows, settings);
  const thisMonth = periodData(rows, settings, `${month}-01`, monthEnd(month));
  const pending = rows.filter((row) => isCardOut(row) && !row.usage).length;
  const shortMonth = MONTHS_SHORT[Number(month.slice(5)) - 1];

  return (
    <>
      <div className="cash-summary-total">
        <span>Joriy balans</span>
        <strong>{money(all.closeTotal)} <small>so‘m</small></strong>
        <div className="cash-summary-split">
          <span><Wallet size={13} /> Naqd: {fmt(all.close.CASH)}</span>
          <span><CreditCard size={13} /> Karta: {fmt(all.close.CARD)}</span>
        </div>
      </div>
      <div className="cash-summary-month">
        <div><span><ArrowDownLeft size={13} /> Kirim · {shortMonth}</span><b className="cash-in">{fmt(thisMonth.inSum)}</b></div>
        <div><span><ArrowUpRight size={13} /> Chiqim · {shortMonth}</span><b className="cash-out">{fmt(thisMonth.outSum)}</b></div>
      </div>
      {pending > 0 && (
        <Link href="/kassa/jurnal?tur=card" className="cash-summary-alert">
          {pending} ta karta to‘lovi bo‘yicha ishlatilishi yozilmagan <ArrowRight size={12} />
        </Link>
      )}
      {canWrite && <Link href="/kassa/yangi" className="button button-secondary cash-summary-add">Kassa yozuvi qo‘shish</Link>}
    </>
  );
}
