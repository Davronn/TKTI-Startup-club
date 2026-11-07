'use client';

import { Archive, Building2, CreditCard, Pencil, Plus, UserRound, Wallet, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ACCOUNT_SHORT,
  CashTransaction,
  categoryMeta,
  categoryOf,
  dayName,
  docLabel,
  expense,
  fmt,
  fmtDecimal,
  income,
  isCardOut,
  money,
  monthKey,
  monthName,
  MONTHS_SHORT,
  receiptUrl,
  shortMoney,
  shownAmount,
  titleOf,
} from '@/lib/cash';

export function CategoryIcon({ name, size = 18, large }: { name: string; size?: number; large?: boolean }) {
  const meta = categoryMeta(name);
  const Icon = meta.icon;
  return (
    <span className={`cash-cat-icon${large ? ' large' : ''}`} style={{ '--c': meta.color } as React.CSSProperties}>
      <Icon size={size} />
    </span>
  );
}

const isPdf = (r: CashTransaction) => r.receipt?.mimeType === 'application/pdf';

/* ---------------- chek ko‘rish oynasi ---------------- */

export function ReceiptViewer({ row, onClose }: { row: CashTransaction | null; onClose: () => void }) {
  useEffect(() => {
    if (!row) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [row, onClose]);
  if (!row?.receipt) return null;
  const url = receiptUrl(row.receipt.id);
  return (
    <div className="cash-modal" role="dialog" aria-modal="true" aria-label="Chek" onClick={onClose}>
      <div className="cash-modal-box" onClick={(event) => event.stopPropagation()}>
        <div className="cash-modal-head">
          <div>
            <strong>{docLabel(row)} · {titleOf(row)}</strong>
            <span>{dayName(row.date)} · {fmt(shownAmount(row))} so‘m</span>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Yopish"><X size={18} /></button>
        </div>
        {isPdf(row) ? (
          <div className="cash-modal-pdf">
            <span className="cash-pdf-badge large">PDF</span>
            <a className="button button-primary" href={url} target="_blank" rel="noreferrer">PDF faylni ochish</a>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`Chek: ${titleOf(row)}`} />
        )}
      </div>
    </div>
  );
}

/* ---------------- ishlatilishi (karta o‘tkazmalari) ---------------- */

function UsageBox({ row, canWrite, onSave }: { row: CashTransaction; canWrite: boolean; onSave: (usage: string) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(row.usage);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!open) setText(row.usage); }, [row.usage, open]);

  if (open) {
    return (
      <div className="cash-usage editing">
        <label htmlFor={`usage-${row.id}`}>O‘tkazilgan pul nimaga ishlatildi</label>
        <textarea id={`usage-${row.id}`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Masalan: 20 ta bannerga 180 000, qolgani transportga ketdi" autoFocus maxLength={2000} />
        <div className="cash-inline-actions">
          <button type="button" className="button button-secondary" onClick={() => setOpen(false)}>Bekor qilish</button>
          <button
            type="button"
            className="button button-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try { await onSave(text.trim()); setOpen(false); } catch { /* xabar toast orqali */ } finally { setBusy(false); }
            }}
          >
            {busy ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>
        </div>
      </div>
    );
  }
  if (row.usage) {
    return (
      <div className="cash-usage">
        <span className="cash-usage-label">Ishlatilishi</span>
        <span>{row.usage}</span>
        {canWrite && <button type="button" className="icon-button" onClick={() => setOpen(true)} aria-label="Ishlatilishini tahrirlash"><Pencil size={14} /></button>}
      </div>
    );
  }
  if (!canWrite) return <div className="cash-usage muted">Nimaga ishlatilgani hali yozilmagan</div>;
  return (
    <button type="button" className="cash-usage-add" onClick={() => setOpen(true)}>
      <Plus size={14} /> Nimaga ishlatilganini yozish <span className="muted">(ixtiyoriy)</span>
    </button>
  );
}

/* ---------------- yozuv qatori ---------------- */

export function TxRow({
  row,
  canWrite,
  compact,
  onOpenReceipt,
  onArchive,
  onUsage,
}: {
  row: CashTransaction;
  canWrite?: boolean;
  compact?: boolean;
  onOpenReceipt: (row: CashTransaction) => void;
  onArchive?: (row: CashTransaction, reason: string) => Promise<unknown>;
  onUsage?: (row: CashTransaction, usage: string) => Promise<unknown>;
}) {
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const category = categoryOf(row);
  const card = isCardOut(row);
  const amountClass = row.kind === 'IN' ? 'cash-in' : row.kind === 'OUT' ? 'cash-out' : 'cash-move';
  const sign = row.kind === 'IN' ? '+' : row.kind === 'OUT' ? '−' : '⇄ ';

  return (
    <div className="cash-row" style={{ '--c': categoryMeta(category).color } as React.CSSProperties}>
      <CategoryIcon name={category} size={19} large />
      <div className="cash-row-main">
        <strong>{titleOf(row)}</strong>
        <div className="cash-row-meta">
          <span className="cash-doc">{docLabel(row)}</span>
          {row.kind === 'MOVE'
            ? <span className="cash-row-cat">{ACCOUNT_SHORT[row.fromAccount!]} → {ACCOUNT_SHORT[row.toAccount!]}</span>
            : <span className="cash-row-cat">{row.category}</span>}
          {row.quantity && row.unitPrice ? <span>{fmtDecimal(row.quantity)} × {fmt(row.unitPrice)}</span> : null}
          {row.kind !== 'MOVE' && row.account && (
            <span className="cash-acc">
              {row.account === 'CARD' ? <CreditCard size={12} /> : <Wallet size={12} />}
              {card && row.recipient ? `→ ${row.recipient}` : ACCOUNT_SHORT[row.account]}
            </span>
          )}
          {row.startup && (
            <Link href={`/startups/${row.startup.id}`} className="cash-startup"><Building2 size={12} />{row.startup.name}</Link>
          )}
          {row.person && <span>{row.person}</span>}
          {!compact && row.createdByName && <span className="muted"><UserRound size={11} /> {row.createdByName}</span>}
          {row.receipt && (
            <button type="button" className="cash-receipt-chip" onClick={() => onOpenReceipt(row)} aria-label="Chekni ochish">
              {isPdf(row)
                ? <span className="cash-pdf-badge">PDF</span>
                // eslint-disable-next-line @next/next/no-img-element
                : <img loading="lazy" alt="" src={receiptUrl(row.receipt.id)} />}
              Chek
            </button>
          )}
        </div>
      </div>
      <div className="cash-row-amount">
        <span className={amountClass}>{sign}{fmt(shownAmount(row))}</span>
        {row.commission > 0 && (
          <small>komissiya {fmt(row.commission)}{row.commissionPct ? ` (${fmtDecimal(row.commissionPct, 2)}%)` : ''}</small>
        )}
        {canWrite && onArchive && (
          <div className="cash-row-actions">
            <Link href={`/kassa/yozuv/${row.id}`} aria-label="Tahrirlash"><Pencil size={13} /> Tahrirlash</Link>
            <button type="button" className="danger" onClick={() => setConfirm(true)} aria-label="Arxivga o‘tkazish"><Archive size={13} /> Arxivlash</button>
          </div>
        )}
      </div>
      {card && !compact && onUsage && (
        <div className="cash-row-wide"><UsageBox row={row} canWrite={!!canWrite} onSave={(usage) => onUsage(row, usage)} /></div>
      )}
      {card && compact && row.usage && (
        <div className="cash-row-wide"><div className="cash-usage"><span className="cash-usage-label">Ishlatilishi</span><span>{row.usage}</span></div></div>
      )}
      {confirm && onArchive && (
        <div className="cash-row-wide cash-confirm">
          <span><b>{docLabel(row)}</b> arxivga o‘tkazilsinmi? Hisobotlardan chiqadi, Sozlamalar → Arxiv bo‘limida tiklash mumkin.</span>
          <input type="text" placeholder="Sababi (ixtiyoriy)" aria-label="Arxivlash sababi" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
          <div className="cash-inline-actions">
            <button type="button" className="button button-secondary" onClick={() => setConfirm(false)}>Yo‘q</button>
            <button type="button" className="button button-danger" onClick={() => { setConfirm(false); void onArchive(row, reason.trim()); }}>Ha, arxivga</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- grafiklar ---------------- */

export function MonthlyChart({ rows, months, wide }: { rows: CashTransaction[]; months: string[]; wide?: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const data = months.map((m) => {
    const list = rows.filter((r) => monthKey(r.date) === m);
    return {
      m,
      in: list.reduce((s, r) => s + income(r), 0),
      out: list.reduce((s, r) => s + expense(r), 0),
      commission: list.reduce((s, r) => s + r.commission, 0),
      count: list.length,
    };
  });
  const max = Math.max(0, ...data.map((d) => Math.max(d.in, d.out)));
  const nice = (v: number) => {
    if (v <= 0) return 1;
    const p = 10 ** Math.floor(Math.log10(v));
    const f = v / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  };
  const top = nice(max);
  const n = months.length;
  const W = wide ? 980 : n > 6 ? 720 : 560, H = 220, L = 58, R = 8, T = 14, B = 30;
  const ph = H - T - B, gw = (W - L - R) / n, bw = Math.min(22, gw * 0.3);
  const y = (v: number) => T + ph - (v / top) * ph;
  const d = active !== null ? data[active] : null;
  const tipLeft = active !== null ? Math.min(84, Math.max(16, ((L + gw * active + gw / 2) / W) * 100)) : 0;

  return (
    <div className="cash-chart" onMouseLeave={() => setActive(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Oylar bo‘yicha kirim va chiqim">
        <rect x={L + gw * (n - 1) + 4} y={T - 6} width={gw - 8} height={ph + B + 2} rx="10" fill="var(--brand-soft)" />
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={y(top * f)} y2={y(top * f)} stroke="var(--line)" strokeDasharray={f ? '3 5' : undefined} />
            <text x={L - 8} y={y(top * f) + 4} textAnchor="end" fontSize="11" fontWeight="600" fill="var(--muted)">{max ? shortMoney(top * f) : ''}</text>
          </g>
        ))}
        {data.map((item, i) => {
          const cx = L + gw * i + gw / 2;
          const hi = item.in ? Math.max(3, (ph * item.in) / top) : 0;
          const ho = item.out ? Math.max(3, (ph * item.out) / top) : 0;
          const current = i === n - 1 || active === i;
          return (
            <g key={item.m} opacity={active !== null && active !== i ? 0.45 : 1}>
              {hi > 0 && <rect x={cx - bw - 2} y={T + ph - hi} width={bw} height={hi} rx="5" fill="var(--cash-in)" />}
              {ho > 0 && <rect x={cx + 2} y={T + ph - ho} width={bw} height={ho} rx="5" fill="var(--cash-out)" />}
              <text x={cx} y={H - 10} textAnchor="middle" fontSize="12" fill={current ? 'var(--ink)' : 'var(--muted)'} fontWeight={current ? 800 : 600}>
                {MONTHS_SHORT[Number(item.m.slice(5)) - 1]}
              </text>
            </g>
          );
        })}
        {!max && (
          <text x={L + (W - L - R) / 2} y={T + ph / 2} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--muted)">
            Yozuvlar qo‘shilgach, oylik dinamika shu yerda chiqadi
          </text>
        )}
        {data.map((item, i) => (
          <rect key={`hit-${item.m}`} x={L + gw * i} y="0" width={gw} height={H} fill="transparent" style={{ cursor: 'pointer' }}
            onMouseEnter={() => setActive(i)} onClick={() => setActive((a) => (a === i ? null : i))}>
            <title>{monthName(item.m)}</title>
          </rect>
        ))}
      </svg>
      {d && (
        <div className="cash-chart-tip" style={{ left: `${tipLeft}%` }} role="status">
          <b>{monthName(d.m)}</b>
          <div><i style={{ background: 'var(--cash-in)' }} />Kirim<em>{d.in ? `+${fmt(d.in)}` : '0'}</em></div>
          <div><i style={{ background: 'var(--cash-out)' }} />Chiqim<em>{d.out ? `−${fmt(d.out)}` : '0'}</em></div>
          {d.commission > 0 && <div className="muted"><i />shundan komissiya<em>{fmt(d.commission)}</em></div>}
          <div className="cash-chart-net">Farq<em className={d.in - d.out < 0 ? 'cash-out' : 'cash-in'}>{money(d.in - d.out, true)} so‘m</em></div>
          <small>{d.count} ta operatsiya</small>
        </div>
      )}
    </div>
  );
}

export function CategoryBars({ items, total }: { items: [string, number][]; total: number }) {
  const max = items.length ? items[0][1] : 1;
  return (
    <div className="cash-cat-bars">
      {items.map(([name, value]) => (
        <div key={name} className="cash-cat-bar" style={{ '--c': categoryMeta(name).color } as React.CSSProperties} title={`${name}: ${fmt(value)} so‘m`}>
          <CategoryIcon name={name} size={15} />
          <span className="cash-cat-name">{name}</span>
          <span className="cash-cat-value">{fmt(value)} <small>{total ? Math.round((value / total) * 100) : 0}%</small></span>
          <span className="cash-cat-track"><i style={{ width: `${Math.max(3, (value / max) * 100)}%` }} /></span>
        </div>
      ))}
    </div>
  );
}

export function CategoryDonut({ items, total }: { items: [string, number][]; total: number }) {
  const [active, setActive] = useState<string | null>(null);
  const R = 58, C = 2 * Math.PI * R;
  let offset = 0;
  const current = active ? items.find(([k]) => k === active) : null;
  return (
    <div className="cash-donut-wrap">
      <div className="cash-donut" onMouseLeave={() => setActive(null)}>
        <svg width="170" height="170" viewBox="0 0 170 170" role="img" aria-label="Yo‘nalishlar ulushi">
          <circle cx="85" cy="85" r={R} fill="none" stroke="#edf2f8" strokeWidth="22" />
          {items.map(([name, value]) => {
            const len = (value / total) * C;
            const el = (
              <circle key={name} cx="85" cy="85" r={R} fill="none" stroke={categoryMeta(name).color}
                strokeWidth={active === name ? 28 : 22} opacity={!active || active === name ? 1 : 0.25}
                strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-offset} transform="rotate(-90 85 85)"
                onMouseEnter={() => setActive(name)} onClick={() => setActive((a) => (a === name ? null : name))} style={{ cursor: 'pointer', transition: '.15s' }}>
                <title>{name}: {fmt(value)} so‘m</title>
              </circle>
            );
            offset += len;
            return el;
          })}
          <text x="85" y="80" textAnchor="middle" fontSize={current ? 20 : 11} fontWeight={current ? 800 : 700} fill={current ? categoryMeta(current[0]).color : 'var(--muted)'}>
            {current ? `${Math.round((current[1] / total) * 100)}%` : 'JAMI'}
          </text>
          <text x="85" y="101" textAnchor="middle" fontSize="15" fontWeight="800" fill="var(--ink)">{shortMoney(current ? current[1] : total)}</text>
        </svg>
        <div className="cash-donut-caption">{current ? <><b style={{ color: categoryMeta(current[0]).color }}>{current[0]}</b><span>{fmt(current[1])} so‘m</span></> : <span>Bo‘lak ustiga olib boring</span>}</div>
      </div>
      <CategoryBars items={items} total={total} />
    </div>
  );
}

export function CashEmpty({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="cash-empty">
      <b>{title}</b>
      <p>{text}</p>
      {action}
    </div>
  );
}
