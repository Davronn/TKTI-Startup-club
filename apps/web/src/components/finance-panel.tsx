'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CircleDollarSign,
  Landmark,
  Pencil,
  Plus,
  ReceiptText,
  Settings2,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import {
  FinanceCategory,
  FinanceOverview,
  FinanceTransaction,
  FinanceTransactionStatus,
  FinanceTransactionType,
  FundingRoundStatus,
  FundingRoundType,
  FundingRound,
} from '@/lib/types';

const typeLabels: Record<FinanceTransactionType, string> = {
  INCOME: 'Kirim',
  EXPENSE: 'Chiqim',
  FUNDING: 'Moliyalashtirish',
};
const statusLabels: Record<FinanceTransactionStatus, string> = {
  PLANNED: 'Rejada',
  COMPLETED: 'Amalga oshgan',
  CANCELLED: 'Bekor qilingan',
};
const categoryLabels: Record<FinanceCategory, string> = {
  SALES: 'Sotuv', SERVICES: 'Xizmatlar', GRANT: 'Grant', INVESTMENT: 'Investitsiya', LOAN: 'Qarz',
  EQUIPMENT: 'Uskuna', SOFTWARE: 'Dasturiy ta’minot', MARKETING: 'Marketing', SALARY: 'Ish haqi',
  RENT: 'Ijara', OPERATIONS: 'Operatsion xarajat', TAX: 'Soliq', TRAVEL: 'Safar', OTHER: 'Boshqa',
};
const roundTypeLabels: Record<FundingRoundType, string> = {
  BOOTSTRAP: 'Bootstrap', GRANT: 'Grant', PRE_SEED: 'Pre-seed', SEED: 'Seed', SERIES_A: 'Series A',
  SERIES_B: 'Series B', SERIES_C: 'Series C', OTHER: 'Boshqa',
};
const roundStatusLabels: Record<FundingRoundStatus, string> = {
  PLANNED: 'Rejada', OPEN: 'Ochiq', CLOSED: 'Yopilgan', CANCELLED: 'Bekor qilingan',
};

const today = () => new Date().toISOString().slice(0, 10);

type PanelMode = 'transaction' | 'round' | 'settings' | null;

export function FinancePanel({
  startupId,
  canEdit,
  canDelete,
}: {
  startupId: string;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<PanelMode>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'ALL' | FinanceTransactionType>('ALL');
  const [transaction, setTransaction] = useState({
    type: 'EXPENSE' as FinanceTransactionType,
    category: 'EQUIPMENT' as FinanceCategory,
    status: 'COMPLETED' as FinanceTransactionStatus,
    title: '', amount: '', currency: 'UZS', exchangeRate: '1', counterparty: '', paymentMethod: '',
    reference: '', occurredAt: today(), receiptUrl: '', notes: '', fundingRoundId: '',
  });
  const [round, setRound] = useState({
    type: 'PRE_SEED' as FundingRoundType, status: 'PLANNED' as FundingRoundStatus, name: '',
    targetAmount: '', raisedAmount: '', currency: 'UZS', exchangeRate: '1', investorName: '',
    equityPercent: '', preMoneyValuation: '', postMoneyValuation: '', openedAt: today(), closedAt: '', notes: '',
  });
  const [settings, setSettings] = useState({
    baseCurrency: 'UZS', openingBalance: '0', budgetAmount: '', budgetStartDate: '', budgetEndDate: '', notes: '',
  });

  const financeKey = ['startup-finance', startupId];
  const { data, isLoading } = useQuery({
    queryKey: financeKey,
    queryFn: () => apiFetch<FinanceOverview>(`/startups/${startupId}/finance`),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: financeKey });

  const transactionMutation = useMutation({
    mutationFn: () => apiFetch(`/startups/${startupId}/finance/transactions${editingTransactionId ? `/${editingTransactionId}` : ''}`, {
      method: editingTransactionId ? 'PATCH' : 'POST',
      body: JSON.stringify({
        ...transaction,
        amount: Number(transaction.amount),
        exchangeRate: Number(transaction.exchangeRate),
        fundingRoundId: transaction.fundingRoundId || null,
        counterparty: transaction.counterparty || null,
        paymentMethod: transaction.paymentMethod || null,
        reference: transaction.reference || null,
        receiptUrl: transaction.receiptUrl || null,
        notes: transaction.notes || null,
      }),
    }),
    onSuccess: () => {
      toast.success(editingTransactionId ? 'Moliyaviy operatsiya yangilandi' : 'Moliyaviy operatsiya qo‘shildi');
      setTransaction((value) => ({ ...value, title: '', amount: '', counterparty: '', reference: '', receiptUrl: '', notes: '' }));
      setMode(null);
      setEditingTransactionId(null);
      void refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Operatsiyani saqlab bo‘lmadi'),
  });
  const roundMutation = useMutation({
    mutationFn: () => apiFetch(`/startups/${startupId}/finance/funding-rounds${editingRoundId ? `/${editingRoundId}` : ''}`, {
      method: editingRoundId ? 'PATCH' : 'POST',
      body: JSON.stringify({
        ...round,
        targetAmount: round.targetAmount ? Number(round.targetAmount) : null,
        raisedAmount: round.raisedAmount ? Number(round.raisedAmount) : undefined,
        exchangeRate: Number(round.exchangeRate),
        equityPercent: round.equityPercent ? Number(round.equityPercent) : null,
        preMoneyValuation: round.preMoneyValuation ? Number(round.preMoneyValuation) : null,
        postMoneyValuation: round.postMoneyValuation ? Number(round.postMoneyValuation) : null,
        investorName: round.investorName || null,
        openedAt: round.openedAt || null,
        closedAt: round.closedAt || null,
        notes: round.notes || null,
      }),
    }),
    onSuccess: () => { toast.success(editingRoundId ? 'Investitsiya raundi yangilandi' : 'Investitsiya raundi qo‘shildi'); setEditingRoundId(null); setMode(null); void refresh(); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Raundni saqlab bo‘lmadi'),
  });
  const settingsMutation = useMutation({
    mutationFn: () => apiFetch(`/startups/${startupId}/finance/profile`, {
      method: 'PATCH',
      body: JSON.stringify({
        baseCurrency: settings.baseCurrency,
        openingBalance: Number(settings.openingBalance || 0),
        budgetAmount: settings.budgetAmount ? Number(settings.budgetAmount) : null,
        budgetStartDate: settings.budgetStartDate || null,
        budgetEndDate: settings.budgetEndDate || null,
        notes: settings.notes || null,
      }),
    }),
    onSuccess: () => { toast.success('Moliya sozlamalari yangilandi'); setMode(null); void refresh(); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Sozlamalarni saqlab bo‘lmadi'),
  });
  const deleteTransaction = useMutation({
    mutationFn: (id: string) => apiFetch(`/startups/${startupId}/finance/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Operatsiya o‘chirildi'); void refresh(); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Operatsiyani o‘chirib bo‘lmadi'),
  });
  const deleteRound = useMutation({
    mutationFn: (id: string) => apiFetch(`/startups/${startupId}/finance/funding-rounds/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Raund o‘chirildi'); void refresh(); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Raundni o‘chirib bo‘lmadi'),
  });

  const filteredTransactions = useMemo(
    () => data?.transactions.filter((item) => typeFilter === 'ALL' || item.type === typeFilter) || [],
    [data?.transactions, typeFilter],
  );
  const openSettings = () => {
    if (data) setSettings({
      baseCurrency: data.profile.baseCurrency,
      openingBalance: String(data.profile.openingBalance || 0),
      budgetAmount: data.profile.budgetAmount == null ? '' : String(data.profile.budgetAmount),
      budgetStartDate: data.profile.budgetStartDate?.slice(0, 10) || '',
      budgetEndDate: data.profile.budgetEndDate?.slice(0, 10) || '',
      notes: data.profile.notes || '',
    });
    setMode('settings');
  };
  const openTransaction = (item?: FinanceTransaction) => {
    setEditingTransactionId(item?.id || null);
    setTransaction(item ? {
      type: item.type, category: item.category, status: item.status, title: item.title,
      amount: String(item.amount), currency: item.currency, exchangeRate: String(item.exchangeRate),
      counterparty: item.counterparty || '', paymentMethod: item.paymentMethod || '', reference: item.reference || '',
      occurredAt: item.occurredAt.slice(0, 10), receiptUrl: item.receiptUrl || '', notes: item.notes || '',
      fundingRoundId: item.fundingRoundId || '',
    } : {
      type: 'EXPENSE', category: 'EQUIPMENT', status: 'COMPLETED', title: '', amount: '', currency,
      exchangeRate: '1', counterparty: '', paymentMethod: '', reference: '', occurredAt: today(), receiptUrl: '', notes: '', fundingRoundId: '',
    });
    setMode('transaction');
  };
  const openRound = (item?: FundingRound) => {
    setEditingRoundId(item?.id || null);
    setRound(item ? {
      type: item.type, status: item.status, name: item.name, targetAmount: item.targetAmount == null ? '' : String(item.targetAmount),
      raisedAmount: String(item.raisedAmount), currency: item.currency, exchangeRate: String(item.exchangeRate),
      investorName: item.investorName || '', equityPercent: item.equityPercent == null ? '' : String(item.equityPercent),
      preMoneyValuation: item.preMoneyValuation == null ? '' : String(item.preMoneyValuation),
      postMoneyValuation: item.postMoneyValuation == null ? '' : String(item.postMoneyValuation),
      openedAt: item.openedAt?.slice(0, 10) || '', closedAt: item.closedAt?.slice(0, 10) || '', notes: item.notes || '',
    } : {
      type: 'PRE_SEED', status: 'PLANNED', name: '', targetAmount: '', raisedAmount: '', currency,
      exchangeRate: '1', investorName: '', equityPercent: '', preMoneyValuation: '', postMoneyValuation: '', openedAt: today(), closedAt: '', notes: '',
    });
    setMode('round');
  };

  if (isLoading || !data) return <div className="finance-loading">Moliyaviy ma’lumotlar yuklanmoqda...</div>;
  const currency = data.summary.baseCurrency;
  const budgetPercent = data.summary.budgetAmount
    ? Math.min(100, (data.summary.budgetSpent / data.summary.budgetAmount) * 100)
    : 0;
  const maxCategory = Math.max(...data.summary.expenseByCategory.map((item) => item.amount), 1);

  return (
    <div className="finance-panel">
      <div className="finance-toolbar">
        <div>
          <span className="finance-eyebrow">Moliyaviy boshqaruv</span>
          <h3>Pul oqimi va investitsiyalar</h3>
          <p>Barcha summalar {currency} bazaviy valutasiga keltirilgan.</p>
        </div>
        {canEdit && <div className="finance-actions">
          <button className="button button-secondary" onClick={openSettings}><Settings2 size={14} /> Sozlamalar</button>
          <button className="button button-secondary" onClick={() => openRound()}><Landmark size={14} /> Raund</button>
          <button className="button button-primary" onClick={() => openTransaction()}><Plus size={14} /> Operatsiya</button>
        </div>}
      </div>

      <div className="finance-kpis">
        <FinanceKpi icon={<WalletCards size={18} />} label="Mavjud balans" value={formatMoney(data.summary.cashBalance, currency)} tone="blue" />
        <FinanceKpi icon={<ArrowUpRight size={18} />} label="Jami kirim" value={formatMoney(data.summary.income + data.summary.funding, currency)} detail={`Investitsiya: ${formatMoney(data.summary.funding, currency, true)}`} tone="green" />
        <FinanceKpi icon={<ArrowDownRight size={18} />} label="Jami chiqim" value={formatMoney(data.summary.expenses, currency)} detail={`Bu oy: ${formatMoney(data.summary.monthExpense, currency, true)}`} tone="red" />
        <FinanceKpi icon={<CalendarDays size={18} />} label="Runway" value={data.summary.runwayMonths == null ? 'Hisoblanmaydi' : `${data.summary.runwayMonths.toFixed(1)} oy`} detail={`Oylik burn: ${formatMoney(data.summary.monthlyBurn, currency, true)}`} tone="violet" />
      </div>

      {mode && <section className="finance-editor">
        <div className="finance-editor-head">
          <div><strong>{mode === 'transaction' ? (editingTransactionId ? 'Operatsiyani tahrirlash' : 'Yangi operatsiya') : mode === 'round' ? (editingRoundId ? 'Raundni tahrirlash' : 'Investitsiya raundi') : 'Moliya sozlamalari'}</strong><span>Majburiy maydonlarni aniq kiriting</span></div>
          <button className="icon-button" onClick={() => setMode(null)} aria-label="Yopish"><X size={17} /></button>
        </div>
        {mode === 'transaction' && <form className="finance-form" onSubmit={(event) => { event.preventDefault(); transactionMutation.mutate(); }}>
          <label className="form-field"><span>Turi <em>*</em></span><select value={transaction.type} onChange={(e) => setTransaction({ ...transaction, type: e.target.value as FinanceTransactionType })}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="form-field"><span>Kategoriya <em>*</em></span><select value={transaction.category} onChange={(e) => setTransaction({ ...transaction, category: e.target.value as FinanceCategory })}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="form-field finance-span-2"><span>Nima olindi yoki kirim sababi <em>*</em></span><input required maxLength={160} value={transaction.title} onChange={(e) => setTransaction({ ...transaction, title: e.target.value })} placeholder="Masalan: 2 ta noutbuk xaridi" /></label>
          <label className="form-field"><span>Summa <em>*</em></span><input required min="0.01" step="0.01" type="number" value={transaction.amount} onChange={(e) => setTransaction({ ...transaction, amount: e.target.value })} /></label>
          <label className="form-field"><span>Valuta</span><input required maxLength={3} value={transaction.currency} onChange={(e) => setTransaction({ ...transaction, currency: e.target.value.toUpperCase() })} /></label>
          <label className="form-field"><span>{transaction.type === 'EXPENSE' ? 'Kimdan olindi / sotuvchi' : 'Kimdan tushdi / manba'}</span><input value={transaction.counterparty} onChange={(e) => setTransaction({ ...transaction, counterparty: e.target.value })} placeholder="Tashkilot yoki shaxs" /></label>
          <label className="form-field"><span>Sana <em>*</em></span><input required type="date" value={transaction.occurredAt} onChange={(e) => setTransaction({ ...transaction, occurredAt: e.target.value })} /></label>
          <label className="form-field"><span>Holati</span><select value={transaction.status} onChange={(e) => setTransaction({ ...transaction, status: e.target.value as FinanceTransactionStatus })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="form-field"><span>To‘lov usuli</span><input value={transaction.paymentMethod} onChange={(e) => setTransaction({ ...transaction, paymentMethod: e.target.value })} placeholder="Bank, naqd, karta..." /></label>
          {transaction.type === 'FUNDING' && <label className="form-field"><span>Investitsiya raundi</span><select value={transaction.fundingRoundId} onChange={(e) => setTransaction({ ...transaction, fundingRoundId: e.target.value })}><option value="">Raundga biriktirilmagan</option>{data.fundingRounds.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
          <label className="form-field"><span>Bazaviy valutaga kurs</span><input required min="0.000001" step="0.000001" type="number" value={transaction.exchangeRate} onChange={(e) => setTransaction({ ...transaction, exchangeRate: e.target.value })} /><small>1 {transaction.currency} = nechta {currency}</small></label>
          <label className="form-field"><span>Hujjat raqami</span><input value={transaction.reference} onChange={(e) => setTransaction({ ...transaction, reference: e.target.value })} placeholder="Hisob-faktura yoki chek №" /></label>
          <label className="form-field"><span>Chek/hujjat havolasi</span><input type="url" value={transaction.receiptUrl} onChange={(e) => setTransaction({ ...transaction, receiptUrl: e.target.value })} placeholder="https://..." /></label>
          <label className="form-field finance-span-2"><span>Izoh</span><textarea value={transaction.notes} onChange={(e) => setTransaction({ ...transaction, notes: e.target.value })} /></label>
          <div className="finance-form-actions finance-span-2"><button type="button" className="button button-secondary" onClick={() => setMode(null)}>Bekor qilish</button><button className="button button-primary" disabled={transactionMutation.isPending}>Saqlash</button></div>
        </form>}
        {mode === 'round' && <form className="finance-form" onSubmit={(event) => { event.preventDefault(); roundMutation.mutate(); }}>
          <label className="form-field finance-span-2"><span>Raund nomi <em>*</em></span><input required value={round.name} onChange={(e) => setRound({ ...round, name: e.target.value })} placeholder="Masalan: Pre-seed 2026" /></label>
          <label className="form-field"><span>Raund turi</span><select value={round.type} onChange={(e) => setRound({ ...round, type: e.target.value as FundingRoundType })}>{Object.entries(roundTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="form-field"><span>Holati</span><select value={round.status} onChange={(e) => setRound({ ...round, status: e.target.value as FundingRoundStatus })}>{Object.entries(roundStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="form-field"><span>Maqsad summa</span><input type="number" min="0" step="0.01" value={round.targetAmount} onChange={(e) => setRound({ ...round, targetAmount: e.target.value })} /></label>
          <label className="form-field"><span>Jalb qilingan</span><input type="number" min="0" step="0.01" value={round.raisedAmount} onChange={(e) => setRound({ ...round, raisedAmount: e.target.value })} /></label>
          <label className="form-field"><span>Valuta</span><input required maxLength={3} value={round.currency} onChange={(e) => setRound({ ...round, currency: e.target.value.toUpperCase() })} /></label>
          <label className="form-field"><span>Bazaviy valutaga kurs</span><input required min="0.000001" step="0.000001" type="number" value={round.exchangeRate} onChange={(e) => setRound({ ...round, exchangeRate: e.target.value })} /></label>
          <label className="form-field"><span>Investor</span><input value={round.investorName} onChange={(e) => setRound({ ...round, investorName: e.target.value })} /></label>
          <label className="form-field"><span>Beriladigan ulush (%)</span><input type="number" min="0" max="100" step="0.0001" value={round.equityPercent} onChange={(e) => setRound({ ...round, equityPercent: e.target.value })} /></label>
          <label className="form-field"><span>Pre-money baholash</span><input type="number" min="0" step="0.01" value={round.preMoneyValuation} onChange={(e) => setRound({ ...round, preMoneyValuation: e.target.value })} /></label>
          <label className="form-field"><span>Post-money baholash</span><input type="number" min="0" step="0.01" value={round.postMoneyValuation} onChange={(e) => setRound({ ...round, postMoneyValuation: e.target.value })} /></label>
          <label className="form-field"><span>Boshlanish sanasi</span><input type="date" value={round.openedAt} onChange={(e) => setRound({ ...round, openedAt: e.target.value })} /></label>
          <label className="form-field"><span>Yopilish sanasi</span><input type="date" value={round.closedAt} onChange={(e) => setRound({ ...round, closedAt: e.target.value })} /></label>
          <label className="form-field finance-span-2"><span>Izoh</span><textarea value={round.notes} onChange={(e) => setRound({ ...round, notes: e.target.value })} /></label>
          <div className="finance-form-actions finance-span-2"><button type="button" className="button button-secondary" onClick={() => setMode(null)}>Bekor qilish</button><button className="button button-primary" disabled={roundMutation.isPending}>Raundni saqlash</button></div>
        </form>}
        {mode === 'settings' && <form className="finance-form" onSubmit={(event) => { event.preventDefault(); settingsMutation.mutate(); }}>
          <label className="form-field"><span>Asosiy valuta</span><input required maxLength={3} value={settings.baseCurrency} onChange={(e) => setSettings({ ...settings, baseCurrency: e.target.value.toUpperCase() })} /></label>
          <label className="form-field"><span>Boshlang‘ich balans</span><input type="number" step="0.01" value={settings.openingBalance} onChange={(e) => setSettings({ ...settings, openingBalance: e.target.value })} /></label>
          <label className="form-field"><span>Budjet miqdori</span><input type="number" min="0" step="0.01" value={settings.budgetAmount} onChange={(e) => setSettings({ ...settings, budgetAmount: e.target.value })} /></label>
          <label className="form-field"><span>Budjet boshlanishi</span><input type="date" value={settings.budgetStartDate} onChange={(e) => setSettings({ ...settings, budgetStartDate: e.target.value })} /></label>
          <label className="form-field"><span>Budjet tugashi</span><input type="date" value={settings.budgetEndDate} onChange={(e) => setSettings({ ...settings, budgetEndDate: e.target.value })} /></label>
          <label className="form-field finance-span-2"><span>Moliyaviy izoh</span><textarea value={settings.notes} onChange={(e) => setSettings({ ...settings, notes: e.target.value })} /></label>
          <div className="finance-form-actions finance-span-2"><button type="button" className="button button-secondary" onClick={() => setMode(null)}>Bekor qilish</button><button className="button button-primary" disabled={settingsMutation.isPending}>Sozlamalarni saqlash</button></div>
        </form>}
      </section>}

      <div className="finance-insights">
        <section className="finance-block">
          <div className="finance-block-head"><div><h4>Budjet nazorati</h4><span>{data.summary.budgetAmount ? `${budgetPercent.toFixed(0)}% sarflandi` : 'Budjet hali belgilanmagan'}</span></div><Banknote size={18} /></div>
          {data.summary.budgetAmount ? <>
            <div className="budget-track"><i style={{ width: `${budgetPercent}%` }} /></div>
            <div className="budget-values"><span>Sarflandi <strong>{formatMoney(data.summary.budgetSpent, currency, true)}</strong></span><span>Qoldi <strong>{formatMoney(data.summary.budgetRemaining || 0, currency, true)}</strong></span></div>
          </> : <button className="finance-text-button" disabled={!canEdit} onClick={openSettings}>Budjetni belgilash</button>}
        </section>
        <section className="finance-block">
          <div className="finance-block-head"><div><h4>Xarajat tarkibi</h4><span>Kategoriya bo‘yicha</span></div><CircleDollarSign size={18} /></div>
          <div className="category-bars">{data.summary.expenseByCategory.length ? data.summary.expenseByCategory.slice(0, 5).map((item) => <div className="category-row" key={item.category}><span>{categoryLabels[item.category]}</span><div><i style={{ width: `${(item.amount / maxCategory) * 100}%` }} /></div><strong>{formatMoney(item.amount, currency, true)}</strong></div>) : <p>Hali xarajat kiritilmagan.</p>}</div>
        </section>
      </div>

      <section className="finance-table-section">
        <div className="finance-section-title"><div><h4>Operatsiyalar</h4><span>{data.transactions.length} ta yozuv</span></div><select className="select-control" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}><option value="ALL">Barchasi</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="data-table-wrap"><table className="data-table finance-table"><thead><tr><th>Sana va operatsiya</th><th>Turi</th><th>Kontragent / manba</th><th>Holati</th><th>Summa</th>{canEdit && <th />}</tr></thead><tbody>
          {filteredTransactions.map((item) => <tr key={item.id}>
            <td><div className="finance-operation"><span className={`finance-type-icon finance-type-${item.type.toLowerCase()}`}>{item.type === 'EXPENSE' ? <ArrowDownRight size={15} /> : <ArrowUpRight size={15} />}</span><div><strong>{item.title}</strong><span>{formatDate(item.occurredAt)} · {categoryLabels[item.category]}</span></div></div></td>
            <td><span className={`finance-pill finance-pill-${item.type.toLowerCase()}`}>{typeLabels[item.type]}</span></td>
            <td><span>{item.counterparty || '—'}</span>{item.reference && <small className="finance-reference">№ {item.reference}</small>}</td>
            <td><span className={`finance-status finance-status-${item.status.toLowerCase()}`}>{statusLabels[item.status]}</span></td>
            <td className={`finance-amount ${item.type === 'EXPENSE' ? 'negative' : 'positive'}`}>{item.type === 'EXPENSE' ? '−' : '+'}{formatMoney(item.amount, item.currency)}{item.currency !== currency && <small className="finance-reference">{formatMoney(item.baseAmount, currency)}</small>}</td>
            {canEdit && <td><div className="finance-row-actions"><button className="icon-button" aria-label="Operatsiyani tahrirlash" onClick={() => openTransaction(item)}><Pencil size={13} /></button>{canDelete && <button className="icon-button danger-icon" aria-label="Operatsiyani o‘chirish" onClick={() => window.confirm('Bu moliyaviy operatsiya o‘chirilsinmi?') && deleteTransaction.mutate(item.id)}><Trash2 size={14} /></button>}</div></td>}
          </tr>)}
        </tbody></table></div>
        {!filteredTransactions.length && <div className="finance-empty"><ReceiptText size={24} /><strong>Operatsiyalar yo‘q</strong><span>Daromad, xarajat yoki moliyalashtirishni kiriting.</span></div>}
      </section>

      <section className="finance-rounds">
        <div className="finance-section-title"><div><h4>Investitsiya raundlari</h4><span>Fundraising va ulush nazorati</span></div></div>
        <div className="round-grid">{data.fundingRounds.map((item) => {
          const progress = Number(item.targetAmount) > 0 ? Math.min(100, Number(item.raisedAmount) / Number(item.targetAmount) * 100) : 0;
          return <article className="round-card" key={item.id}><div className="round-card-head"><span className="round-icon"><Landmark size={16} /></span><div><strong>{item.name}</strong><span>{roundTypeLabels[item.type]} · {roundStatusLabels[item.status]}</span></div>{canEdit && <div className="finance-row-actions"><button className="icon-button" aria-label="Raundni tahrirlash" onClick={() => openRound(item)}><Pencil size={13} /></button>{canDelete && <button className="icon-button danger-icon" aria-label="Raundni o‘chirish" onClick={() => window.confirm('Investitsiya raundi o‘chirilsinmi?') && deleteRound.mutate(item.id)}><Trash2 size={13} /></button>}</div>}</div><div className="round-money"><strong>{formatMoney(item.raisedAmount, item.currency, true)}</strong><span> / {item.targetAmount ? formatMoney(item.targetAmount, item.currency, true) : 'maqsad yo‘q'}</span></div>{item.targetAmount && <div className="budget-track"><i style={{ width: `${progress}%` }} /></div>}<div className="round-meta"><span>Investor: <strong>{item.investorName || 'Kiritilmagan'}</strong></span><span>Ulush: <strong>{item.equityPercent ? `${Number(item.equityPercent)}%` : '—'}</strong></span></div></article>;
        })}</div>
        {!data.fundingRounds.length && <div className="finance-empty compact"><Landmark size={22} /><strong>Raundlar yo‘q</strong><span>Rejalashtirilgan yoki yopilgan investitsiya raundini qo‘shing.</span></div>}
      </section>
    </div>
  );
}

function FinanceKpi({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail?: string; tone: string }) {
  return <article className="finance-kpi"><span className={`finance-kpi-icon ${tone}`}>{icon}</span><div><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div></article>;
}
