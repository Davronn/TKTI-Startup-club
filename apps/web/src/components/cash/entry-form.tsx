'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Camera, CreditCard, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import {
  ACCOUNT_LABELS,
  ACCOUNT_SHORT,
  CashAccount,
  CashKind,
  CashSettings,
  CashTransaction,
  categoriesFor,
  categoryMeta,
  dayName,
  decimalInput,
  docLabel,
  fmt,
  fmtDecimal,
  money,
  moneyInput,
  MOVE_CATEGORY,
  nextDocLabel,
  parseDecimal,
  parseMoney,
  periodData,
  receiptUrl,
  todayIso,
} from '@/lib/cash';
import { Startup } from '@/lib/types';
import { CASH_KEYS } from './cash-data';
import { CategoryIcon } from './cash-parts';

/** Katta rasmlarni yuklashdan oldin kichraytiramiz (1800px, JPEG 85%). */
async function compress(file: File): Promise<Blob> {
  if (!/^image\//.test(file.type) || file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

function CommissionField({ id, base, pct, setPct, label }: { id: string; base: number; pct: string; setPct: (v: string) => void; label: string }) {
  const p = parseDecimal(pct);
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <div className="cash-pct-row">
        <div className="cash-amount small">
          <input id={id} type="text" inputMode="decimal" autoComplete="off" placeholder="0" value={pct} onChange={(e) => setPct(decimalInput(e.target.value, 2))} />
          <span>%</span>
        </div>
        <div className="cash-chips">
          {['0,5', '1', '1,5', '2'].map((v) => (
            <button key={v} type="button" className="cash-chip" aria-pressed={pct === v} onClick={() => setPct(v)}>{v}%</button>
          ))}
          <button type="button" className="cash-chip" aria-pressed={!p} onClick={() => setPct('')}>Yo‘q</button>
        </div>
      </div>
      <span className="cash-hint">
        {p ? <>{fmt(base)} so‘mning {fmtDecimal(p, 2)}% = <b>{fmt(Math.round((base * p) / 100))} so‘m</b> komissiya</> : 'Komissiya olinmagan bo‘lsa, “Yo‘q”ni tanlang.'}
      </span>
    </div>
  );
}

export function CashEntryForm({
  rows,
  all,
  settings,
  editing,
  startKind = 'OUT',
}: {
  rows: CashTransaction[];
  all: CashTransaction[];
  settings: CashSettings;
  editing?: CashTransaction;
  startKind?: CashKind;
}) {
  const e = editing;
  const router = useRouter();
  const queryClient = useQueryClient();
  const defaultPct = settings.defaultCommissionPct ? fmtDecimal(settings.defaultCommissionPct, 2) : '';
  const k0 = e?.kind ?? startKind;

  const [kind, setKind] = useState<CashKind>(k0);
  const [category, setCategory] = useState(e && e.kind !== 'MOVE' ? e.category : categoriesFor(k0)[0].name);
  const [itemized, setItemized] = useState(!!e?.quantity);
  const [amount, setAmount] = useState(e && !e.quantity ? fmt(e.amount) : '');
  const [price, setPrice] = useState(e?.unitPrice ? fmt(e.unitPrice) : '');
  const [qty, setQty] = useState(e?.quantity ? fmtDecimal(e.quantity) : '1');
  const [account, setAccount] = useState<CashAccount>(e?.account ?? 'CASH');
  const [from, setFrom] = useState<CashAccount>(e?.fromAccount ?? 'CARD');
  const [recipient, setRecipient] = useState(e?.recipient ?? '');
  const [pct, setPct] = useState(e ? (e.commissionPct ? fmtDecimal(e.commissionPct, 2) : '') : k0 === 'OUT' ? defaultPct : '');
  const [usage, setUsage] = useState(e?.usage ?? '');
  const [date, setDate] = useState(e?.date ?? todayIso());
  const [note, setNote] = useState(e?.note ?? '');
  const [person, setPerson] = useState(e?.person ?? '');
  const [startupId, setStartupId] = useState(e?.startup?.id ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [keep, setKeep] = useState<CashTransaction['receipt']>(e?.receipt ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const amountRef = useRef<HTMLInputElement>(null);

  const { data: startupPage } = useQuery({
    queryKey: ['startups', 'cash-select'],
    queryFn: () => apiFetch<{ items: Startup[] }>('/startups?limit=100'),
  });
  const startups = useMemo(() => {
    const list = startupPage?.items ?? [];
    if (e?.startup && !list.some((s) => s.id === e.startup!.id)) return [{ id: e.startup.id, name: e.startup.name } as Startup, ...list];
    return list;
  }, [startupPage, e]);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : keep ? receiptUrl(keep.id) : null), [file, keep]);
  useEffect(() => () => { if (file && preview) URL.revokeObjectURL(preview); }, [file, preview]);
  const previewPdf = file ? file.type === 'application/pdf' : keep?.mimeType === 'application/pdf';
  useEffect(() => {
    if (!e && window.innerWidth > 820) amountRef.current?.focus({ preventScroll: true });
  }, [e]);

  function switchKind(next: CashKind) {
    setKind(next);
    if (next !== 'MOVE' && !categoriesFor(next).some((c) => c.name === category)) setCategory(categoriesFor(next)[0].name);
    if (next === 'MOVE') setItemized(false);
    if (!e) setPct(next === 'OUT' ? defaultPct : '');
  }

  const isMove = kind === 'MOVE';
  const p = parseMoney(price);
  const q = parseDecimal(qty);
  const base = itemized && !isMove ? Math.round(p * q) : parseMoney(amount);
  const hasCommission = isMove || (kind === 'OUT' && account === 'CARD');
  const pctValue = hasCommission ? parseDecimal(pct) : 0;
  const commission = Math.round((base * pctValue) / 100);
  const total = kind === 'OUT' ? base + commission : base;
  const to: CashAccount = from === 'CARD' ? 'CASH' : 'CARD';

  const balance = useMemo(() => periodData(rows, settings), [rows, settings]);
  const sourceBalance = isMove ? balance.close[from] : kind === 'OUT' ? balance.close[account] : null;
  const need = isMove ? base + commission : total;
  const editAdjust =
    e && ((isMove && e.kind === 'MOVE' && e.fromAccount === from) || (kind === 'OUT' && e.kind === 'OUT' && e.account === account))
      ? e.amount + e.commission
      : 0;
  const overdraw = sourceBalance !== null && need > 0 && need > sourceBalance + editAdjust;
  const docNo = e && e.kind === kind ? docLabel(e) : nextDocLabel(all, kind);
  const previewCategory = isMove ? MOVE_CATEGORY : category;

  // Tahrirlashda — boshlang‘ich holatdan farq; yangi yozuvda — foydalanuvchi biror narsa kiritgani
  const signature = JSON.stringify([kind, category, itemized, amount, price, qty, account, from, recipient, pct, usage, date, note, person, startupId, keep?.id ?? null, Boolean(file)]);
  const [initialSignature] = useState(signature);
  const dirty = !busy && (e
    ? signature !== initialSignature
    : Boolean(amount || price || note.trim() || file || recipient.trim() || usage.trim() || person.trim()));
  const confirmLeave = useUnsavedChanges(dirty);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (itemized && !isMove) {
      if (!p) return setError('1 tasining narxini kiriting.');
      if (!q) return setError('Nechta olinganini kiriting.');
    } else if (!base) {
      amountRef.current?.focus();
      return setError('Summani kiriting.');
    }
    if (kind === 'OUT' && account === 'CARD' && !recipient.trim()) return setError('Pul kimga o‘tkazilganini yozing.');
    if (pctValue >= 50) return setError('Komissiya foizi juda katta. Tekshirib qayta kiriting.');
    if (!date) return setError('Sanani tanlang.');
    if (!isMove && !note.trim()) return setError(kind === 'OUT' ? 'Mablag‘ nima uchun ishlatilganini yozing.' : 'Mablag‘ qayerdan tushganini yozing.');

    setBusy(true);
    setError('');
    try {
      let receiptId = keep?.id ?? null;
      if (file) {
        if (file.size > 10 * 1024 * 1024 && !/^image\//.test(file.type)) throw new Error('Fayl 10 MB dan katta bo‘lmasin.');
        const blob = await compress(file);
        const form = new FormData();
        form.append('file', blob, file.name || 'chek');
        receiptId = (await apiFetch<{ id: string }>('/cash/receipts', { method: 'POST', body: form })).id;
      }
      const payload = {
        kind,
        amount: itemized && !isMove ? undefined : base,
        quantity: itemized && !isMove ? q : null,
        unitPrice: itemized && !isMove ? p : null,
        date,
        category: isMove ? undefined : category,
        note: note.trim(),
        person: person.trim(),
        account: isMove ? null : account,
        fromAccount: isMove ? from : null,
        recipient: kind === 'OUT' && account === 'CARD' ? recipient.trim() : '',
        commissionPct: hasCommission ? pctValue : 0,
        usage: kind === 'OUT' && account === 'CARD' ? usage.trim() : '',
        receiptId,
        startupId: startupId || null,
      };
      const saved = await apiFetch<CashTransaction>(e ? `/cash/transactions/${e.id}` : '/cash/transactions', {
        method: e ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      await queryClient.invalidateQueries({ queryKey: CASH_KEYS.transactions });
      if (e) {
        toast.success(`${docLabel(saved)} yangilandi`);
        router.push('/kassa/jurnal');
      } else {
        toast.success(`${docLabel(saved)} saqlandi: ${fmt(saved.kind === 'OUT' ? saved.amount + saved.commission : saved.amount)} so‘m`);
        setAmount(''); setPrice(''); setQty('1'); setNote(''); setFile(null); setKeep(null); setUsage(''); setRecipient('');
        amountRef.current?.focus({ preventScroll: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saqlab bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cash-form-layout">
      <form className="card cash-form" onSubmit={submit} noValidate>
        <div className="cash-seg three" role="group" aria-label="Operatsiya turi">
          <button type="button" className="out" aria-pressed={kind === 'OUT'} onClick={() => switchKind('OUT')}>Chiqim</button>
          <button type="button" className="in" aria-pressed={kind === 'IN'} onClick={() => switchKind('IN')}>Kirim</button>
          <button type="button" className="move" aria-pressed={isMove} onClick={() => switchKind('MOVE')}>O‘tkazma</button>
        </div>

        {isMove && (
          <div className="cash-block">
            <span className="cash-label">Qayerdan qayerga</span>
            <div className="cash-seg" role="group" aria-label="Yo‘nalish">
              <button type="button" aria-pressed={from === 'CARD'} onClick={() => setFrom('CARD')}><CreditCard size={16} />Kartadan naqdga</button>
              <button type="button" aria-pressed={from === 'CASH'} onClick={() => setFrom('CASH')}><Wallet size={16} />Naqddan kartaga</button>
            </div>
            <span className="cash-hint">O‘z hisoblaringiz orasidagi pul ko‘chishi: umumiy balans o‘zgarmaydi, faqat komissiya chiqimga yoziladi.</span>
          </div>
        )}

        <div className="cash-block">
          <div className="cash-block-head">
            <span className="cash-label">{itemized && !isMove ? 'Narx va soni' : 'Summa'}</span>
            {!isMove && (
              <label className="cash-switch">
                <input
                  type="checkbox"
                  checked={itemized}
                  onChange={(ev) => {
                    setItemized(ev.target.checked);
                    if (ev.target.checked && !price && amount) { setPrice(amount); setQty('1'); }
                    if (!ev.target.checked && !amount && base) setAmount(fmt(base));
                  }}
                />
                <span />Narx × soni
              </label>
            )}
          </div>
          {itemized && !isMove ? (
            <>
              <div className="cash-calc">
                <div className="form-field">
                  <label htmlFor="cash-price">1 tasining narxi</label>
                  <div className="cash-amount small"><input id="cash-price" type="text" inputMode="numeric" autoComplete="off" placeholder="0" value={price} onChange={(ev) => setPrice(moneyInput(ev.target.value))} /><span>so‘m</span></div>
                </div>
                <span className="cash-times" aria-hidden="true">×</span>
                <div className="form-field">
                  <label htmlFor="cash-qty">Soni</label>
                  <div className="cash-stepper">
                    <button type="button" aria-label="Kamaytirish" onClick={() => setQty(fmtDecimal(Math.max(1, Math.ceil(q) - 1)))}>−</button>
                    <input id="cash-qty" type="text" inputMode="decimal" autoComplete="off" value={qty} onChange={(ev) => setQty(decimalInput(ev.target.value, 3))} />
                    <button type="button" aria-label="Ko‘paytirish" onClick={() => setQty(fmtDecimal(Math.floor(q) + 1))}>+</button>
                  </div>
                </div>
              </div>
              <div className="cash-calc-result"><span>{p ? fmt(p) : '0'} × {q ? fmtDecimal(q) : '0'} =</span><b>{fmt(base)} so‘m</b></div>
            </>
          ) : (
            <>
              <div className="cash-amount"><input ref={amountRef} type="text" inputMode="numeric" autoComplete="off" placeholder="0" aria-label="Summa" value={amount} onChange={(ev) => setAmount(moneyInput(ev.target.value))} /><span>so‘m</span></div>
              {!isMove && <span className="cash-hint">Bir nechta bir xil narsa olgan bo‘lsangiz, “Narx × soni”ni yoqing.</span>}
            </>
          )}
        </div>

        {!isMove ? (
          <div className="cash-block">
            <span className="cash-label">{kind === 'OUT' ? 'To‘lov usuli' : 'Qayerga tushdi'}</span>
            <div className="cash-seg" role="group" aria-label="Hisob">
              <button type="button" aria-pressed={account === 'CASH'} onClick={() => setAccount('CASH')}><Wallet size={16} />{kind === 'OUT' ? 'Naqd pul' : 'Naqd kassaga'}</button>
              <button type="button" aria-pressed={account === 'CARD'} onClick={() => setAccount('CARD')}><CreditCard size={16} />{kind === 'OUT' ? 'Karta orqali o‘tkazma' : 'Bank kartasiga'}</button>
            </div>
            {kind === 'OUT' && account === 'CARD' && (
              <div className="cash-card-box">
                <div className="form-field"><label htmlFor="cash-recipient">Kimga o‘tkazildi</label><input id="cash-recipient" type="text" autoComplete="off" placeholder="Ism yoki tashkilot" value={recipient} onChange={(ev) => setRecipient(ev.target.value)} maxLength={120} /></div>
                <CommissionField id="cash-pct" base={base} pct={pct} setPct={setPct} label="Komissiya foizi" />
                <div className="form-field"><label htmlFor="cash-usage">O‘tkazilgan pul nimaga ishlatildi <span className="muted">(ixtiyoriy)</span></label>
                  <textarea id="cash-usage" value={usage} onChange={(ev) => setUsage(ev.target.value)} maxLength={2000} placeholder="Hozir bilmasangiz, keyinroq Jurnaldan yozib qo‘yishingiz mumkin" /></div>
              </div>
            )}
          </div>
        ) : (
          <div className="cash-block"><CommissionField id="cash-pct" base={base} pct={pct} setPct={setPct} label="Komissiya foizi (pul yechish yoki o‘tkazish uchun)" /></div>
        )}

        {overdraw && (
          <div className="cash-warning">
            <AlertTriangle size={17} />
            <span>{ACCOUNT_LABELS[isMove ? from : account]}da {fmt(sourceBalance! + editAdjust)} so‘m bor, bu yozuv {fmt(need)} so‘m talab qiladi. Saqlash mumkin, lekin qoldiq manfiy bo‘ladi — boshlang‘ich qoldiq yoki avvalgi kirimlarni tekshiring.</span>
          </div>
        )}

        {!isMove && (
          <div className="form-field">
            <span className="cash-label" id="cash-cat-label">Kategoriya</span>
            <div className="cash-cat-grid" role="group" aria-labelledby="cash-cat-label">
              {categoriesFor(kind).map((c) => (
                <button key={c.name} type="button" className="cash-cat-button" style={{ '--c': c.color } as React.CSSProperties} aria-pressed={c.name === category} onClick={() => setCategory(c.name)}>
                  <CategoryIcon name={c.name} size={15} /><span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="form-grid">
          <div className="form-field"><label htmlFor="cash-date">Sana</label><input id="cash-date" type="date" value={date} onChange={(ev) => setDate(ev.target.value)} /></div>
          <div className="form-field"><label htmlFor="cash-person">Mas’ul <span className="muted">(ixtiyoriy)</span></label><input id="cash-person" type="text" autoComplete="off" placeholder="Kim to‘ladi yoki oldi" value={person} onChange={(ev) => setPerson(ev.target.value)} maxLength={120} /></div>
        </div>

        <div className="form-field">
          <label htmlFor="cash-startup">Startap <span className="muted">(ixtiyoriy)</span></label>
          <select id="cash-startup" value={startupId} onChange={(ev) => setStartupId(ev.target.value)}>
            <option value="">— Startapga bog‘lanmagan (umumiy bo‘lim xarajati) —</option>
            {startups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <span className="cash-hint">Masalan, ma’lum startap uchun tadbir yoki grant bo‘lsa, shu startapni tanlang.</span>
        </div>

        <div className="form-field">
          <label htmlFor="cash-note">{isMove ? <>Izoh <span className="muted">(ixtiyoriy)</span></> : kind === 'OUT' ? 'Nima uchun ishlatildi' : 'Qayerdan tushdi'}</label>
          <textarea id="cash-note" value={note} onChange={(ev) => setNote(ev.target.value)} maxLength={1000}
            placeholder={isMove ? (from === 'CARD' ? 'Masalan: Tadbir xarajatlari uchun naqd yechildi' : 'Masalan: Naqd tushum kartaga qo‘yildi') : kind === 'OUT' ? (itemized ? 'Masalan: Tadbir uchun suv, 0,5 litrlik' : 'Masalan: Demo Day uchun zal ijarasi') : 'Masalan: Startap tanlovi uchun homiylik'} />
        </div>

        <div className="form-field">
          <span className="cash-label">Chek yoki rasm <span className="muted">(ixtiyoriy)</span></span>
          <label className="cash-drop" htmlFor="cash-file">
            <span className="cash-drop-preview">
              {preview && previewPdf ? <span className="cash-pdf-badge large">PDF</span>
                // eslint-disable-next-line @next/next/no-img-element
                : preview ? <img alt="" src={preview} /> : <Camera size={22} />}
            </span>
            <span><b>{preview ? (file ? file.name.slice(0, 40) : 'Biriktirilgan chek') : 'Rasm tanlang'}</b>{preview ? 'Almashtirish uchun bosing' : 'Rasm yoki PDF: chek, kvitansiya, o‘tkazma skrinshoti'}</span>
          </label>
          <input id="cash-file" type="file" accept="image/*,application/pdf" hidden onChange={(ev) => { const f = ev.target.files?.[0]; if (f) { setFile(f); setKeep(null); } ev.target.value = ''; }} />
          {preview && <button type="button" className="button button-ghost" onClick={() => { setFile(null); setKeep(null); }}>Rasmni olib tashlash</button>}
        </div>

        <div className="cash-form-submit">
          {e && <button type="button" className="button button-secondary" onClick={() => { if (confirmLeave()) router.push('/kassa/jurnal'); }}>Bekor qilish</button>}
          <button className="button button-primary" type="submit" disabled={busy}>
            {busy ? 'Saqlanmoqda…' : `${e ? 'O‘zgarishlarni saqlash' : 'Saqlash'}${total ? ` · ${fmt(total)} so‘m` : ''}`}
          </button>
        </div>
        <div className="cash-error" role="alert">{error}</div>
      </form>

      <aside className="card cash-preview" aria-label="Ko‘rinishi">
        <span className="cash-label">Hujjat {docNo}</span>
        <div className="cash-preview-title">
          <CategoryIcon name={previewCategory} size={20} large />
          <div>
            <b>{note.trim() || (isMove ? (from === 'CARD' ? 'Kartadan naqd pul yechildi' : 'Naqd pul kartaga qo‘yildi') : 'Izoh')}</b>
            <span style={{ color: categoryMeta(previewCategory).color }}>{isMove ? `${ACCOUNT_LABELS[from]} → ${ACCOUNT_LABELS[to]}` : category}</span>
          </div>
        </div>
        <div className="cash-breakdown">
          {itemized && !isMove ? <div><span>{q ? fmtDecimal(q) : 0} × {fmt(p)}</span><b>{fmt(base)}</b></div> : <div><span>Summa</span><b>{fmt(base)}</b></div>}
          {hasCommission && <div><span>Komissiya {pctValue ? `${fmtDecimal(pctValue, 2)}%` : ''}</span><b>{commission ? `+${fmt(commission)}` : '0'}</b></div>}
          {isMove ? (
            <>
              <div className="total"><span>{ACCOUNT_LABELS[from]}dan chiqadi</span><b className="cash-out">−{fmt(base + commission)}</b></div>
              <div><span>{ACCOUNT_LABELS[to]}ga kiradi</span><b className="cash-in">+{fmt(base)}</b></div>
            </>
          ) : (
            <div className="total"><span>{kind === 'OUT' ? 'Jami chiqim' : 'Jami kirim'}</span><b className={kind === 'IN' ? 'cash-in' : 'cash-out'}>{total ? (kind === 'IN' ? '+' : '−') : ''}{fmt(total)} so‘m</b></div>
          )}
          {sourceBalance !== null && (
            <div><span>Saqlangandan keyin {ACCOUNT_SHORT[isMove ? from : account].toLowerCase()} qoldig‘i</span><b className={sourceBalance + editAdjust - need < 0 ? 'cash-out' : ''}>{money(sourceBalance + editAdjust - need)}</b></div>
          )}
        </div>
        <span className="muted">{date ? dayName(date) : ''}{kind === 'OUT' && account === 'CARD' && recipient.trim() ? ` · karta → ${recipient.trim()}` : ''}{person.trim() ? ` · ${person.trim()}` : ''}</span>
        <ul className="cash-tips">
          <li>Hujjat raqami avtomatik beriladi: K — kirim, Ch — chiqim, O — o‘tkazma.</li>
          <li>Chek yoki o‘tkazma skrinshotini qo‘shsangiz, hisobot ishonchliroq bo‘ladi.</li>
          <li>Kartadan naqd yechsangiz, “O‘tkazma”ni tanlang — bu xarajat emas.</li>
        </ul>
      </aside>
    </div>
  );
}
