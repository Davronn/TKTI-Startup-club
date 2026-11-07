'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleHelp, ImageIcon, Plus, Save, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';
import { Stage, Startup, TeamMember, UserListItem } from '@/lib/types';

interface StartupFormValues {
  name: string;
  currentStageId: string;
  status?: string;
  description?: string;
  problem?: string;
  solution?: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  location?: string;
  teamSize?: number | string;
  foundedAt?: string;
  joinedAt?: string;
  logoUrl?: string;
  pitchDeckUrl?: string;
  curatorId?: string;
}

const emptyMember: TeamMember = { fullName: '', role: '', email: '', phone: '', isFounder: false };

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== '' && item !== undefined && item !== null),
  );
}

// toISOString() UTC beradi — Toshkentda yarim tundan keyin "kecha" bo‘lib qolardi
function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Tahrirlashda tozalanishi mumkin bo‘lgan (majburiy bo‘lmagan) maydonlar
const CLEARABLE_FIELDS = [
  'description', 'problem', 'solution', 'industry', 'website', 'email', 'phone', 'location',
  'teamSize', 'foundedAt', 'logoUrl', 'pitchDeckUrl', 'curatorId',
] as const;

function trimStrings<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, typeof item === 'string' ? item.trim() : item]),
  ) as T;
}

export function StartupForm({ initial }: { initial?: Startup }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [members, setMembers] = useState<TeamMember[]>(initial?.members?.length ? initial.members : [{ ...emptyMember, isFounder: true }]);
  const [initialMembers] = useState(() => JSON.stringify(members));
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { data: stages = [] } = useQuery({ queryKey: ['stages'], queryFn: () => apiFetch<Stage[]>('/stages') });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => apiFetch<UserListItem[]>('/users') });
  const {
    register,
    handleSubmit,
    resetField,
    getValues,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<StartupFormValues>({
    defaultValues: initial ? {
      name: initial.name,
      currentStageId: initial.currentStageId,
      status: initial.status,
      description: initial.description || '',
      problem: initial.problem || '',
      solution: initial.solution || '',
      industry: initial.industry || '',
      website: initial.website || '',
      email: initial.email || '',
      phone: initial.phone || '',
      location: initial.location || '',
      teamSize: initial.teamSize || '',
      foundedAt: initial.foundedAt?.slice(0, 10) || '',
      joinedAt: initial.joinedAt?.slice(0, 10) || '',
      logoUrl: initial.logoUrl || '',
      pitchDeckUrl: initial.pitchDeckUrl || '',
      curatorId: initial.curatorId || '',
    } : { joinedAt: localToday(), status: 'ACTIVE' },
  });

  // Faqat bosqich maydonining boshlang‘ich qiymati o‘rnatiladi; reset() kiritilgan matnni ham "boshlang‘ich" qilib,
  // saqlanmagan o‘zgarishlar ogohlantirishini o‘chirib qo‘yardi
  useEffect(() => {
    if (!initial && stages.length && !getValues('currentStageId')) {
      resetField('currentStageId', { defaultValue: stages.find((stage) => stage.isActive)?.id ?? stages[0].id });
    }
  }, [stages, initial, resetField, getValues]);

  // Bosqich va kurator ro‘yxatlari formadan keyin yuklanadi. Variantlar paydo bo‘lgach, joriy qiymatni select'ga
  // qayta yozamiz — aks holda u "Bosqichni tanlang"/"Biriktirilmagan" ko‘rsatib, saqlanganda kurator o‘chib ketardi
  useEffect(() => {
    if (stages.length) setValue('currentStageId', getValues('currentStageId'));
  }, [stages, setValue, getValues]);
  useEffect(() => {
    if (users.length) setValue('curatorId', getValues('curatorId'));
  }, [users, setValue, getValues]);

  const logoUrlValue = watch('logoUrl');
  const internalLogo = Boolean(logoUrlValue?.startsWith('/api/backend/'));
  const logoPreview = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : logoUrlValue || null), [logoFile, logoUrlValue]);
  useEffect(() => () => { if (logoFile && logoPreview) URL.revokeObjectURL(logoPreview); }, [logoFile, logoPreview]);

  function pickLogo(file?: File) {
    if (logoInputRef.current) logoInputRef.current.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { toast.error('Logotip uchun PNG, JPG, WEBP yoki GIF rasm tanlang'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Logotip 2 MB dan katta bo‘lmasin'); return; }
    setLogoFile(file);
  }
  function clearLogo() {
    setLogoFile(null);
    setValue('logoUrl', '', { shouldDirty: true });
  }

  const dirty = !saved && (isDirty || Boolean(logoFile) || JSON.stringify(members) !== initialMembers);
  const confirmLeave = useUnsavedChanges(dirty);

  function updateMember(index: number, key: keyof TeamMember, value: string | boolean) {
    setMembers((current) => current.map((member, itemIndex) => itemIndex === index ? { ...member, [key]: value } : member));
  }

  async function onSubmit(rawValues: StartupFormValues) {
    const values = trimStrings({ ...rawValues });
    const filledMembers = members
      .map((member) => trimStrings({ ...member }))
      .filter((member) => member.fullName || member.role || member.email || member.phone);
    const shortName = filledMembers.findIndex((member) => member.fullName.length < 2);
    if (shortName !== -1) {
      toast.error(`Jamoa a’zosi #${shortName + 1}: F.I.Sh. kamida 2 ta harf bo‘lishi kerak`);
      return;
    }
    setSubmitting(true);
    try {
      // Serverdan kelgan a’zoda startupId/createdAt kabi maydonlar bor — API ularni rad etadi, faqat ruxsat etilganlarini yuboramiz
      const cleanedMembers = filledMembers.map((member) => compact({
        fullName: member.fullName,
        role: member.role,
        email: member.email,
        phone: member.phone,
        linkedinUrl: member.linkedinUrl,
        isFounder: Boolean(member.isFounder),
      }));
      const payload: Record<string, unknown> = compact({
        ...values,
        // Holat faqat tahrirlashda o‘zgaradi; yaratish API'si bu maydonni qabul qilmaydi (yangi startap doim "Faol")
        status: initial ? values.status : undefined,
        teamSize: values.teamSize ? Number(values.teamSize) : undefined,
        members: cleanedMembers,
      });
      // Tahrirlashda bo‘sh qoldirilgan maydon "o‘zgarmasin" emas, "tozalansin" degani
      if (initial) {
        CLEARABLE_FIELDS.forEach((field) => {
          if (!(field in payload) && initial[field] != null) payload[field] = null;
        });
        // O‘zgarmagan kurator qayta yuborilmaydi: keyinchalik bloklangan bo‘lsa, server uni rad etadi.
        // (Tozalash bosqichidan keyin — aks holda yo‘q maydon "tozalangan" deb null bo‘lib qolardi)
        if (payload.curatorId === initial.curatorId) delete payload.curatorId;
      }
      const startup = await apiFetch<Startup>(initial ? `/startups/${initial.id}` : '/startups', {
        method: initial ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      if (logoFile) {
        // Startap saqlandi; logotip yuklanmasa ham ma’lumotlar yo‘qolmaydi — faqat ogohlantiramiz
        try {
          const form = new FormData();
          form.append('file', logoFile, logoFile.name);
          await apiFetch(`/startups/${startup.id}/logo`, { method: 'POST', body: form });
        } catch (logoError) {
          toast.error(`Startap saqlandi, lekin logotip yuklanmadi: ${logoError instanceof Error ? logoError.message : 'xato'}`);
        }
      }
      setSaved(true);
      toast.success(initial ? 'Startap ma’lumotlari yangilandi' : 'Yangi startap qo‘shildi');
      // Profil, ro‘yxat va pipeline keshdagi eski ma’lumotni ko‘rsatmasin
      queryClient.removeQueries({ queryKey: ['startup', startup.id] });
      void Promise.all(['startups', 'pipeline', 'dashboard'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
      router.push(`/startups/${startup.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ma’lumotlarni saqlab bo‘lmadi');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form-page" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <section className="form-section">
          <div className="form-section-header"><h2>Asosiy ma’lumotlar</h2><p>Startapni aniqlash uchun zarur bo‘lgan ma’lumotlar</p></div>
          <div className="form-section-body form-grid">
            <label className="form-field span-2">
              <span>Startap nomi <em>*</em></span>
              <input {...register('name', { required: true, minLength: 2 })} placeholder="Masalan: AgroSense" />
              {errors.name && <small className="form-error">Startap nomi kamida 2 ta belgidan iborat bo‘lsin</small>}
            </label>
            <label className="form-field">
              <span>Yo‘nalish</span>
              <input {...register('industry')} placeholder="AgriTech, EdTech, FinTech..." />
            </label>
            <label className="form-field">
              <span>Joylashuv</span>
              <input {...register('location')} placeholder="Toshkent" />
            </label>
            <label className="form-field span-2">
              <span>Qisqacha tavsif</span>
              <textarea {...register('description')} placeholder="Startap nima qiladi va kim uchun?" />
            </label>
            <label className="form-field span-2">
              <span>Muammo</span>
              <textarea {...register('problem')} placeholder="Startap qanday muammoni hal qiladi?" />
            </label>
            <label className="form-field span-2">
              <span>Yechim</span>
              <textarea {...register('solution')} placeholder="Taklif qilinayotgan yechimni tushuntiring" />
            </label>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-header"><h2>Rivojlanish holati</h2><p>Bosqich, kurator va klubga qo‘shilish ma’lumotlari</p></div>
          <div className="form-section-body form-grid">
            <label className="form-field">
              <span>Joriy bosqich <em>*</em></span>
              <select {...register('currentStageId', { required: true })}>
                <option value="">Bosqichni tanlang</option>
                {stages.filter((stage) => stage.isActive || stage.id === initial?.currentStageId).map((stage) => <option key={stage.id} value={stage.id}>{stage.name}{stage.isActive ? '' : ' (yashirilgan)'}</option>)}
              </select>
            </label>
            {initial && (
              <label className="form-field">
                <span>Operatsion holat</span>
                <select {...register('status')}>
                  <option value="ACTIVE">Faol</option><option value="PAUSED">To‘xtatilgan</option><option value="GRADUATED">Bitirgan</option>
                </select>
              </label>
            )}
            <label className="form-field">
              <span>Kurator</span>
              <select {...register('curatorId')}>
                <option value="">Biriktirilmagan</option>
                {users.filter((user) => user.isActive || user.id === initial?.curatorId).map((user) => <option key={user.id} value={user.id}>{user.fullName}{user.isActive ? '' : ' (bloklangan)'}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Klubga qo‘shilgan sana</span>
              <input type="date" {...register('joinedAt')} />
            </label>
            <label className="form-field">
              <span>Tashkil topgan sana</span>
              <input type="date" {...register('foundedAt')} />
            </label>
            <label className="form-field">
              <span>Jamoa soni</span>
              <input type="number" min="1" {...register('teamSize')} placeholder="5" />
            </label>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-header"><h2>Aloqa va havolalar</h2><p>Startap bilan bog‘lanish uchun ma’lumotlar</p></div>
          <div className="form-section-body form-grid">
            <label className="form-field"><span>Email</span><input type="email" {...register('email')} placeholder="hello@startup.uz" /></label>
            <label className="form-field"><span>Telefon</span><input {...register('phone')} placeholder="+998 90 123 45 67" /></label>
            <label className="form-field"><span>Veb-sayt</span><input type="url" {...register('website')} placeholder="https://startup.uz" /></label>
            <label className="form-field"><span>Pitch deck havolasi</span><input type="url" {...register('pitchDeckUrl')} placeholder="https://..." /></label>
            <div className="form-field span-2">
              <span>Logotip</span>
              <div className="logo-field">
                <div className="startup-logo avatar-lg">{logoPreview ? <img src={logoPreview} alt="Logotip" /> : <ImageIcon size={20} />}</div>
                <div className="logo-field-body">
                  <div className="logo-field-actions">
                    <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(event) => pickLogo(event.target.files?.[0])} />
                    <button type="button" className="button button-secondary" onClick={() => logoInputRef.current?.click()}><Upload size={15} /> {logoPreview ? 'Boshqa rasm' : 'Rasm yuklash'}</button>
                    {logoPreview && <button type="button" className="button button-ghost" onClick={clearLogo}><Trash2 size={15} /> Olib tashlash</button>}
                  </div>
                  <small>PNG, JPG, WEBP yoki GIF, 2 MB gacha. Startap saqlanganda yuklanadi.</small>
                  {!logoFile && !internalLogo && <input type="url" {...register('logoUrl')} placeholder="yoki rasm havolasini kiriting: https://..." aria-label="Logotip havolasi" />}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-header"><h2>Jamoa a’zolari</h2><p>Asoschilar va asosiy jamoa a’zolarini kiriting</p></div>
          <div className="form-section-body">
            {members.map((member, index) => (
              <div className="member-editor" key={index}>
                <div className="member-editor-head">
                  <strong>Jamoa a’zosi #{index + 1}</strong>
                  {members.length > 1 && <button type="button" className="icon-button" onClick={() => setMembers((current) => current.filter((_, i) => i !== index))}><Trash2 size={15} /></button>}
                </div>
                <div className="form-grid">
                  <label className="form-field"><span>F.I.Sh.</span><input value={member.fullName} onChange={(event) => updateMember(index, 'fullName', event.target.value)} placeholder="Ali Valiyev" /></label>
                  <label className="form-field"><span>Lavozimi</span><input value={member.role || ''} onChange={(event) => updateMember(index, 'role', event.target.value)} placeholder="CEO & Founder" /></label>
                  <label className="form-field"><span>Email</span><input type="email" value={member.email || ''} onChange={(event) => updateMember(index, 'email', event.target.value)} /></label>
                  <label className="form-field"><span>Telefon</span><input value={member.phone || ''} onChange={(event) => updateMember(index, 'phone', event.target.value)} /></label>
                  <label className="form-field span-2" style={{ flexDirection: 'row', alignItems: 'center' }}><input style={{ width: 16, height: 16 }} type="checkbox" checked={member.isFounder || false} onChange={(event) => updateMember(index, 'isFounder', event.target.checked)} /><span>Asoschi</span></label>
                </div>
              </div>
            ))}
            <button type="button" className="button button-secondary" onClick={() => setMembers((current) => [...current, { ...emptyMember }])}><Plus size={16} /> A’zo qo‘shish</button>
          </div>
        </section>

        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={() => { if (confirmLeave()) router.back(); }}>Bekor qilish</button>
          <button className="button button-primary" disabled={submitting}><Save size={16} /> {submitting ? 'Saqlanmoqda...' : initial ? 'O‘zgarishlarni saqlash' : 'Startapni saqlash'}</button>
        </div>
      </div>

      <aside className="form-aside">
        <div className="card help-card">
          <CircleHelp size={21} />
          <h3>Ma’lumot kiritish bo‘yicha</h3>
          <p>Majburiy maydonlar yulduzcha bilan belgilangan. Qolgan ma’lumotlarni keyinchalik ham to‘ldirish mumkin.</p>
        </div>
        <div className="card help-card">
          <h3>Sifatli profil uchun</h3>
          <ul><li>Muammo va yechimni aniq yozing</li><li>Joriy bosqichni to‘g‘ri tanlang</li><li>Mas’ul kuratorni biriktiring</li><li>Jamoa a’zolarini kiriting</li></ul>
        </div>
      </aside>
    </form>
  );
}
