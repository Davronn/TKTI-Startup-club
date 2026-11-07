'use client';

import { CreditCard, FileSpreadsheet, FileText, Percent, Sheet, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CashNav } from '@/components/cash/cash-nav';
import { CategoryDonut, MonthlyChart } from '@/components/cash/cash-parts';
import { useCashData } from '@/components/cash/cash-data';
import { ErrorState, PageLoader } from '@/components/ui';
import { apiDownload, toQuery } from '@/lib/api';
import {
  categoryTotals,
  currentMonth,
  dmy,
  expense,
  fmt,
  income,
  isCardOut,
  lastMonths,
  money,
  monthEnd,
  monthKey,
  monthName,
  monthsOf,
  periodData,
  todayIso,
} from '@/lib/cash';

type Format = 'xlsx' | 'docx' | 'csv';

export default function CashReportsPage() {
  const { loading, error, retry, rows, settings, canWrite } = useCashData();
  const [mode, setMode] = useState<'month' | 'range' | 'all'>('month');
  const [month, setMonth] = useState(currentMonth());
  const [from, setFrom] = useState(`${currentMonth()}-01`);
  const [to, setTo] = useState(todayIso());
  const [busy, setBusy] = useState<Format | ''>('');
  const [range, setRange] = useState(6);
  const [side, setSide] = useState<'OUT' | 'IN'>('OUT');
  const [catMonth, setCatMonth] = useState(currentMonth());
  const months = useMemo(() => monthsOf(rows), [rows]);
  if (loading) return <PageLoader />;
  if (error) return <><CashNav canWrite={canWrite} /><ErrorState error={error} onRetry={retry} /></>;

  let f = '', t = '', label = 'Barcha davr';
  if (mode === 'month') { f = `${month}-01`; t = monthEnd(month); label = monthName(month); }
  if (mode === 'range') { f = from; t = to; label = `${dmy(from)} – ${dmy(to)}`; }
  const pd = periodData(rows, settings, f, t);

  async function download(format: Format) {
    if (mode === 'range' && from > to) return toast.error('Davr boshi oxiridan keyin bo‘lmasin');
    setBusy(format);
    try {
      await apiDownload(`/cash/export${toQuery({ format, from: f || undefined, to: t || undefined, label })}`, `kassa-hisoboti.${format}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fayl tayyorlanmadi');
    } finally {
      setBusy('');
    }
  }

  const items = categoryTotals(rows.filter((r) => !catMonth || monthKey(r.date) === catMonth), side);
  const itemsTotal = items.reduce((s, [, v]) => s + v, 0);
  const all = periodData(rows, settings);
  let running = settings.openingCash + settings.openingCard;
  const book = [...months].sort().map((m) => {
    const list = rows.filter((r) => monthKey(r.date) === m);
    const a = list.reduce((s, r) => s + income(r), 0);
    const b = list.reduce((s, r) => s + expense(r), 0);
    const open = running;
    running += a - b;
    return { m, open, a, b, c: list.reduce((s, r) => s + r.commission, 0), close: running, n: list.length };
  }).reverse();

  return (
    <>
      <CashNav canWrite={canWrite} />
      <section className="card cash-section">
        <div className="card-header">
          <h2>Hisobotni yuklab olish</h2>
          <div className="cash-chips">
            {([['month', 'Oy'], ['range', 'Davr'], ['all', 'Barchasi']] as const).map(([v, l]) => (
              <button key={v} type="button" className="cash-chip" aria-pressed={mode === v} onClick={() => setMode(v)}>{l}</button>
            ))}
          </div>
        </div>
        <div className="card-body">
          <div className="cash-export-row">
            {mode === 'month' && (
              <select className="select-control" aria-label="Oy" value={month} onChange={(e) => setMonth(e.target.value)}>
                {months.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
              </select>
            )}
            {mode === 'range' && (
              <div className="cash-range">
                <input type="date" aria-label="Davr boshi" value={from} onChange={(e) => setFrom(e.target.value)} />
                <span>—</span>
                <input type="date" aria-label="Davr oxiri" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            )}
            <div className="cash-export-summary">
              <div><span>Boshidagi qoldiq</span><b>{money(pd.openTotal)}</b></div>
              <div><span>Kirim</span><b className="cash-in">+{fmt(pd.inSum)}</b></div>
              <div><span>Chiqim</span><b className="cash-out">−{fmt(pd.outSum)}</b></div>
              <div><span>Oxiridagi qoldiq</span><b>{money(pd.closeTotal)}</b></div>
            </div>
          </div>
          <div className="cash-export-buttons">
            <button type="button" className="cash-export xl" disabled={!!busy} onClick={() => void download('xlsx')}>
              <span><FileSpreadsheet size={21} /></span><span><b>{busy === 'xlsx' ? 'Tayyorlanmoqda…' : 'Excel'}</b><small>Jurnal, yo‘nalishlar, oylar · .xlsx</small></span>
            </button>
            <button type="button" className="cash-export wd" disabled={!!busy} onClick={() => void download('docx')}>
              <span><FileText size={21} /></span><span><b>{busy === 'docx' ? 'Tayyorlanmoqda…' : 'Word'}</b><small>Imzo uchun rasmiy hisobot · .docx</small></span>
            </button>
            <button type="button" className="cash-export cv" disabled={!!busy} onClick={() => void download('csv')}>
              <span><Sheet size={21} /></span><span><b>{busy === 'csv' ? 'Tayyorlanmoqda…' : 'CSV'}</b><small>Boshqa dasturlar uchun · .csv</small></span>
            </button>
          </div>
          {(!settings.head || !settings.accountant) && (
            <p className="cash-hint">Word hisobotidagi imzo qatorlariga ism chiqishi uchun Sozlamalarda bo‘lim boshlig‘i va mas’ul hisobchini kiriting.</p>
          )}
        </div>
      </section>

      <section className="cash-kpis">
        <div className="card cash-kpi"><div className="cash-kpi-top"><span className="cash-kpi-icon green"><Wallet size={17} /></span>Naqd kassa</div><b>{money(all.close.CASH)}<small>so‘m</small></b></div>
        <div className="card cash-kpi"><div className="cash-kpi-top"><span className="cash-kpi-icon blue"><CreditCard size={17} /></span>Bank kartasi</div><b>{money(all.close.CARD)}<small>so‘m</small></b></div>
        <div className="card cash-kpi"><div className="cash-kpi-top"><span className="cash-kpi-icon red"><Percent size={17} /></span>Komissiya jami</div><b>{fmt(all.commissionSum)}<small>so‘m</small></b></div>
        <div className="card cash-kpi"><div className="cash-kpi-top"><span className="cash-kpi-icon yellow"><CreditCard size={17} /></span>Hisobotsiz o‘tkazma</div><b>{rows.filter((r) => isCardOut(r) && !r.usage).length}<small>ta</small></b></div>
      </section>

      <section className="card cash-section">
        <div className="card-header">
          <h2>Kirim va chiqim dinamikasi</h2>
          <div className="cash-chips">{[6, 12].map((n) => <button key={n} type="button" className="cash-chip" aria-pressed={range === n} onClick={() => setRange(n)}>{n} oy</button>)}</div>
        </div>
        <div className="card-body">
          <div className="cash-legend"><span><i style={{ background: 'var(--cash-in)' }} />Kirim</span><span><i style={{ background: 'var(--cash-out)' }} />Chiqim (komissiya bilan)</span></div>
          <MonthlyChart rows={rows} months={lastMonths(range)} wide />
        </div>
      </section>

      <section className="card cash-section">
        <div className="card-header">
          <h2>Yo‘nalishlar bo‘yicha</h2>
          <div className="cash-chips">
            <button type="button" className="cash-chip" aria-pressed={side === 'OUT'} onClick={() => setSide('OUT')}>Chiqim</button>
            <button type="button" className="cash-chip" aria-pressed={side === 'IN'} onClick={() => setSide('IN')}>Kirim</button>
          </div>
        </div>
        <div className="cash-filters">
          <select className="select-control" aria-label="Oy" value={catMonth} onChange={(e) => setCatMonth(e.target.value)}>
            <option value="">Barcha oylar</option>
            {months.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
          </select>
        </div>
        <div className="card-body">
          {items.length ? <CategoryDonut items={items} total={itemsTotal} /> : <p className="muted">{catMonth ? monthName(catMonth) : 'Tanlangan davr'} uchun {side === 'OUT' ? 'chiqim' : 'kirim'} yo‘q.</p>}
        </div>
      </section>

      <section className="card">
        <div className="card-header"><h2>Kassa kitobi: oylar kesimida</h2></div>
        <div className="data-table-wrap">
          <table className="data-table cash-book">
            <thead><tr><th>Oy</th><th>Boshidagi qoldiq</th><th>Kirim</th><th>Chiqim</th><th>Shundan komissiya</th><th>Oxiridagi qoldiq</th></tr></thead>
            <tbody>
              {book.map((row) => (
                <tr key={row.m} className={row.m === currentMonth() ? 'current' : ''}>
                  <td><b>{monthName(row.m)}</b> <span className="muted">{row.n} ta</span></td>
                  <td>{money(row.open)}</td>
                  <td className="cash-in">{row.a ? `+${fmt(row.a)}` : '—'}</td>
                  <td className="cash-out">{row.b ? `−${fmt(row.b)}` : '—'}</td>
                  <td className="muted">{row.c ? fmt(row.c) : '—'}</td>
                  <td><b>{money(row.close)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
