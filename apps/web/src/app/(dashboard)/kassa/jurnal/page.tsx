'use client';

import Link from 'next/link';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { CashNav } from '@/components/cash/cash-nav';
import { CashEmpty, ReceiptViewer, TxRow } from '@/components/cash/cash-parts';
import { useCashActions, useCashData } from '@/components/cash/cash-data';
import { ErrorState, PageLoader } from '@/components/ui';
import {
  CASH_IN_CATEGORIES,
  CASH_OUT_CATEGORIES,
  CashTransaction,
  currentMonth,
  dayName,
  docLabel,
  fmt,
  isCardOut,
  money,
  monthKey,
  monthName,
  monthsOf,
  net,
  sortDesc,
  titleOf,
} from '@/lib/cash';

type KindFilter = '' | 'IN' | 'OUT' | 'MOVE' | 'card';

export default function CashJournalPage() {
  const { loading, error, retry, rows, canWrite } = useCashData();
  const actions = useCashActions();
  const [month, setMonth] = useState(currentMonth());
  const [kind, setKind] = useState<KindFilter>('');
  const [account, setAccount] = useState('');
  const [category, setCategory] = useState('');
  const [startup, setStartup] = useState('');
  const [query, setQuery] = useState('');
  const [receipt, setReceipt] = useState<CashTransaction | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tur') === 'card') { setKind('card'); setMonth(''); }
    const s = params.get('startap');
    if (s) { setStartup(s); setMonth(''); }
  }, []);

  const months = useMemo(() => monthsOf(rows), [rows]);
  const startups = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => r.startup && map.set(r.startup.id, r.startup.name));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  if (loading) return <PageLoader />;
  if (error) return <><CashNav canWrite={canWrite} /><ErrorState error={error} onRetry={retry} /></>;

  const q = query.trim().toLowerCase();
  const list = rows
    .filter((r) =>
      (!month || monthKey(r.date) === month) &&
      (!kind || (kind === 'card' ? isCardOut(r) : r.kind === kind)) &&
      (!account || (r.kind === 'MOVE' ? r.fromAccount === account || r.toAccount === account : r.account === account)) &&
      (!category || r.category === category) &&
      (!startup || (startup === 'none' ? !r.startup : r.startup?.id === startup)) &&
      (!q || [titleOf(r), r.person, r.category, r.recipient, r.usage, docLabel(r), r.startup?.name ?? ''].join(' ').toLowerCase().includes(q)),
    )
    .sort(sortDesc);
  const dayTotals = new Map<string, number>();
  list.forEach((r) => dayTotals.set(r.date, (dayTotals.get(r.date) || 0) + net(r)));
  const total = list.reduce((s, r) => s + net(r), 0);
  const pendingUsage = list.filter((r) => isCardOut(r) && !r.usage).length;

  return (
    <>
      <CashNav canWrite={canWrite} />
      <section className="card">
        <div className="card-header cash-journal-head">
          <div className="cash-chips">
            {([['', 'Hammasi'], ['OUT', 'Chiqim'], ['IN', 'Kirim'], ['MOVE', 'O‘tkazmalar'], ['card', 'Karta to‘lovlari']] as [KindFilter, string][]).map(([value, label]) => (
              <button key={value || 'all'} type="button" className="cash-chip" aria-pressed={kind === value} onClick={() => setKind(value)}>{label}</button>
            ))}
          </div>
          {list.length > 0 && <b className={total < 0 ? 'cash-out' : 'cash-in'}>{money(total, true)} so‘m</b>}
        </div>
        <div className="cash-filters">
          <select className="select-control" aria-label="Oy" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">Barcha oylar</option>
            {months.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
          </select>
          <select className="select-control" aria-label="Hisob" value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="">Naqd va karta</option><option value="CASH">Naqd kassa</option><option value="CARD">Bank kartasi</option>
          </select>
          <select className="select-control" aria-label="Kategoriya" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Barcha kategoriyalar</option>
            <optgroup label="Chiqim">{CASH_OUT_CATEGORIES.map((c) => <option key={c.name}>{c.name}</option>)}</optgroup>
            <optgroup label="Kirim">{CASH_IN_CATEGORIES.map((c) => <option key={c.name}>{c.name}</option>)}</optgroup>
          </select>
          <select className="select-control" aria-label="Startap" value={startup} onChange={(e) => setStartup(e.target.value)}>
            <option value="">Barcha startaplar</option>
            <option value="none">Startapga bog‘lanmagan</option>
            {startups.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <input className="cash-search" type="search" placeholder="Qidirish: izoh, ism, hujjat №…" aria-label="Qidirish" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {kind === 'card' && list.length > 0 && (
          <div className="cash-strip">
            {pendingUsage ? <span><b>{pendingUsage} ta</b> o‘tkazmada pul nimaga ishlatilgani hali yozilmagan.</span> : <span>Barcha o‘tkazmalar bo‘yicha hisobot yozilgan.</span>}
            <span>Komissiya jami: <b>{fmt(list.reduce((s, r) => s + r.commission, 0))} so‘m</b></span>
          </div>
        )}
        {list.length ? (
          <div className="cash-list">
            {list.map((r, i) => (
              <Fragment key={r.id}>
                {(i === 0 || list[i - 1].date !== r.date) && (
                  <div className="cash-day"><span>{dayName(r.date)}</span><span>{money(dayTotals.get(r.date) || 0, true)}</span></div>
                )}
                <TxRow
                  row={r}
                  canWrite={canWrite}
                  onOpenReceipt={setReceipt}
                  onArchive={(row, reason) => actions.archive.mutateAsync({ id: row.id, reason })}
                  onUsage={(row, usage) => actions.usage.mutateAsync({ id: row.id, usage })}
                />
              </Fragment>
            ))}
          </div>
        ) : rows.length ? (
          <CashEmpty title="Mos yozuv topilmadi" text="Filtrlarni o‘zgartirib ko‘ring yoki boshqa oyni tanlang." />
        ) : (
          <CashEmpty title="Jurnal hozircha bo‘sh" text="Birinchi kirim yoki chiqimni qo‘shing: summa, kategoriya, sana va xohlasangiz chek rasmi."
            action={canWrite ? <Link className="button button-primary" href="/kassa/yangi">Yozuv qo‘shish</Link> : null} />
        )}
      </section>
      <ReceiptViewer row={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}
