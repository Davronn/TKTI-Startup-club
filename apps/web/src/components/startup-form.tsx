'use client';

import { useQuery } from '@tanstack/react-query';
import { CircleHelp, Plus, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
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

export function StartupForm({ initial }: { initial?: Startup }) {
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>(initial?.members?.length ? initial.members : [{ ...emptyMember, isFounder: true }]);
  const [submitting, setSubmitting] = useState(false);
  const { data: stages = [] } = useQuery({ queryKey: ['stages'], queryFn: () => apiFetch<Stage[]>('/stages') });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => apiFetch<UserListItem[]>('/users') });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
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
    } : { joinedAt: new Date().toISOString().slice(0, 10), status: 'ACTIVE' },
  });

  useEffect(() => {
    if (!initial && stages.length) reset((values) => ({ ...values, currentStageId: values.currentStageId || stages[0].id }));
  }, [stages, initial, reset]);

  function updateMember(index: number, key: keyof TeamMember, value: string | boolean) {
    setMembers((current) => current.map((member, itemIndex) => itemIndex === index ? { ...member, [key]: value } : member));
  }

  async function onSubmit(values: StartupFormValues) {
    setSubmitting(true);
    try {
      const cleanedMembers = members
        .filter((member) => member.fullName.trim())
        .map((member) => compact({ ...member, id: undefined }));
      const payload = compact({
        ...values,
        teamSize: values.teamSize ? Number(values.teamSize) : undefined,
        members: cleanedMembers,
      });
      const startup = await apiFetch<Startup>(initial ? `/startups/${initial.id}` : '/startups', {
        method: initial ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      toast.success(initial ? 'Startap ma’lumotlari yangilandi' : 'Yangi startap qo‘shildi');
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
              {errors.name && <small style={{ color: '#b84048' }}>Startap nomini kiriting</small>}
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
                {stages.filter((stage) => stage.isActive).map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
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
                {users.filter((user) => user.isActive).map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
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
            <label className="form-field"><span>Logotip URL</span><input type="url" {...register('logoUrl')} placeholder="https://..." /></label>
            <label className="form-field span-2"><span>Pitch deck URL</span><input type="url" {...register('pitchDeckUrl')} placeholder="https://..." /></label>
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
          <button type="button" className="button button-secondary" onClick={() => router.back()}>Bekor qilish</button>
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
