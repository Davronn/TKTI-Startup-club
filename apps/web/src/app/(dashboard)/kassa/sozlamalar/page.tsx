'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CashNav } from '@/components/cash/cash-nav';
import { CashEmpty, CategoryIcon } from '@/components/cash/cash-parts';
import { CASH_KEYS, useCashActions, useCashData } from '@/components/cash/cash-data';
import { ErrorState, PageLoader } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { CashSettings, categoryOf, dayName, decimalInput, docLabel, fmt, fmtDecimal, moneyInput, parseDecimal, parseMoney, shownAmount, titleOf } from '@/lib/cash';

export default function CashSettingsPage() {
  const { loading, error, retry, settings, archived, canWrite, isAdmin } = useCashData();
  const actions = useCashActions();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ orgName: '', unitName: '', head: '', accountant: '', openingCash: '', openingCard: '', openingDate: '', defaultPct: '' });
  const [purgeId, setPurgeId] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      orgName: settings.orgName,
      unitName: settings.unitName,
      head: settings.head,
      accountant: settings.accountant,
      openingCash: settings.openingCash ? fmt(settings.openingCash) : '',
      openingCard: settings.openingCard ? fmt(settings.openingCard) : '',
      openingDate: settings.openingDate ?? '',
      defaultPct: settings.defaultCommissionPct ? fmtDecimal(settings.defaultCommissionPct, 2) : '',
    });
  }, [settings]);

  const save = useMutation({
    mutationFn: () => apiFetch<CashSettings>('/cash/settings', {
      method: 'PUT',
      body: JSON.stringify({
        orgName: form.orgName,
        unitName: form.unitName,
        head: form.head,
        accountant: form.accountant,
        openingCash: parseMoney(form.openingCash),
        openingCard: parseMoney(form.openingCard),
        openingDate: form.openingDate || null,
        defaultCommissionPct: parseDecimal(form.defaultPct),
      }),
    }),
    onSuccess: (data) => { queryClient.setQueryData(CASH_KEYS.settings, data); toast.success('Kassa sozlamalari saqlandi'); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Saqlab bo‘lmadi'),
  });

  if (loading) return <PageLoader />;
  // Sozlamalar yuklanmasa forma standart qiymatlar bilan ochilib, saqlanganda haqiqiy sozlamalarni bosib ketmasin
  if (error) return <><CashNav canWrite={canWrite} /><ErrorState error={error} onRetry={retry} /></>;
  const readOnly = !isAdmin;
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); save.mutate(); };

  return (
    <>
      <CashNav canWrite={canWrite} />
      <form className="cash-settings-grid" onSubmit={submit}>
        <section className="card">
          <div className="card-header"><h2>Tashkilot va mas’ullar</h2>{readOnly && <span className="muted">Faqat administrator o‘zgartiradi</span>}</div>
          <div className="card-body cash-stack">
            <div className="form-field"><label htmlFor="s-org">Tashkilot</label><input id="s-org" disabled={readOnly} value={form.orgName} onChange={(e) => set('orgName', e.target.value)} maxLength={200} /></div>
            <div className="form-field"><label htmlFor="s-unit">Bo‘lim nomi</label><input id="s-unit" disabled={readOnly} value={form.unitName} onChange={(e) => set('unitName', e.target.value)} maxLength={300} /></div>
            <div className="form-grid">
              <div className="form-field"><label htmlFor="s-head">Bo‘lim boshlig‘i</label><input id="s-head" disabled={readOnly} placeholder="F.I.Sh." value={form.head} onChange={(e) => set('head', e.target.value)} maxLength={120} /></div>
              <div className="form-field"><label htmlFor="s-acc">Mas’ul hisobchi</label><input id="s-acc" disabled={readOnly} placeholder="F.I.Sh." value={form.accountant} onChange={(e) => set('accountant', e.target.value)} maxLength={120} /></div>
            </div>
            <p className="cash-hint">Bu ismlar Word hisobotidagi imzo qatorlarida chiqadi.</p>
          </div>
        </section>
        <section className="card">
          <div className="card-header"><h2>Boshlang‘ich qoldiq va komissiya</h2></div>
          <div className="card-body cash-stack">
            <div className="form-grid">
              <div className="form-field"><label htmlFor="s-cash">Naqd kassada</label><div className="cash-amount small"><input id="s-cash" inputMode="numeric" disabled={readOnly} placeholder="0" value={form.openingCash} onChange={(e) => set('openingCash', moneyInput(e.target.value))} /><span>so‘m</span></div></div>
              <div className="form-field"><label htmlFor="s-card">Bank kartasida</label><div className="cash-amount small"><input id="s-card" inputMode="numeric" disabled={readOnly} placeholder="0" value={form.openingCard} onChange={(e) => set('openingCard', moneyInput(e.target.value))} /><span>so‘m</span></div></div>
            </div>
            <div className="form-grid">
              <div className="form-field"><label htmlFor="s-date">Qoldiq qaysi sanaga</label><input id="s-date" type="date" disabled={readOnly} value={form.openingDate} onChange={(e) => set('openingDate', e.target.value)} /></div>
              <div className="form-field"><label htmlFor="s-pct">Standart komissiya</label><div className="cash-amount small"><input id="s-pct" inputMode="decimal" disabled={readOnly} placeholder="0" value={form.defaultPct} onChange={(e) => set('defaultPct', decimalInput(e.target.value, 2))} /><span>%</span></div></div>
            </div>
            <p className="cash-hint">Kassa tizimga kiritilgan kundagi qoldiq. Barcha balanslar shu qiymatdan hisoblanadi. Standart komissiya karta orqali chiqimda avtomatik qo‘yiladi.</p>
            {!readOnly && <div className="cash-inline-actions"><button className="button button-primary" type="submit" disabled={save.isPending}>{save.isPending ? 'Saqlanmoqda…' : 'Sozlamalarni saqlash'}</button></div>}
          </div>
        </section>
      </form>

      <section className="card">
        <div className="card-header"><h2>Arxiv</h2><span className="muted">{archived.length} ta yozuv · hisobotlarga kirmaydi</span></div>
        {archived.length ? (
          <div className="cash-list">
            {archived.map((r) => (
              <div key={r.id} className="cash-row archived">
                <CategoryIcon name={categoryOf(r)} size={19} large />
                <div className="cash-row-main">
                  <strong>{titleOf(r)}</strong>
                  <div className="cash-row-meta">
                    <span className="cash-doc">{docLabel(r)}</span><span>{dayName(r.date)}</span><span>{fmt(shownAmount(r))} so‘m</span>
                    <span className="muted">Arxivladi: {r.archivedByName || '—'}, {formatDate(r.archivedAt, true)}{r.archiveReason ? ` · Sababi: ${r.archiveReason}` : ''}</span>
                  </div>
                </div>
                <div className="cash-row-actions visible">
                  {canWrite && <button type="button" onClick={() => actions.restore.mutate(r.id)}><RotateCcw size={13} /> Tiklash</button>}
                  {isAdmin && <button type="button" className="danger" onClick={() => setPurgeId(r.id)}><Trash2 size={13} /> Butunlay o‘chirish</button>}
                </div>
                {purgeId === r.id && (
                  <div className="cash-row-wide cash-confirm">
                    <span><b>{docLabel(r)}</b> butunlay o‘chirilsinmi? Bu amalni qaytarib bo‘lmaydi (audit jurnalida qayd qoladi).</span>
                    <div className="cash-inline-actions">
                      <button type="button" className="button button-secondary" onClick={() => setPurgeId(null)}>Yo‘q</button>
                      <button type="button" className="button button-danger" onClick={() => { setPurgeId(null); actions.purge.mutate(r.id); }}>Ha, o‘chirish</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <CashEmpty title="Arxiv bo‘sh" text="Jurnalda arxivga o‘tkazilgan yozuvlar shu yerda saqlanadi va tiklanishi mumkin." />
        )}
      </section>
    </>
  );
}
