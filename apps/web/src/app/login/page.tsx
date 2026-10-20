'use client';

import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Logo } from '@/components/logo';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const [email, setEmail] = useState('admin@startupclub.uz');
  const [password, setPassword] = useState('ChangeMe123!');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await refresh();
      router.replace('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Tizimga kirib bo‘lmadi');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-grid" />
        <div className="login-brand"><Logo /></div>
        <div className="login-message">
          <span className="eyebrow">STARTUP ECOSYSTEM</span>
          <h1>G‘oyadan o‘sishgacha — hammasi bir joyda.</h1>
          <p>Klubingizdagi startaplar rivojini tartibli boshqaring, kuzating va tezlashtiring.</p>
          <div className="login-proof">
            <div><ShieldCheck size={20} /><span>Xavfsiz kirish</span></div>
            <div><span className="pulse-dot" /><span>Real vaqt monitoringi</span></div>
          </div>
        </div>
        <div className="floating-card floating-card-one">
          <span>FAOL STARTAPLAR</span><strong>24</strong><i>+12%</i>
        </div>
        <div className="floating-card floating-card-two">
          <span>ENG FAOL BOSQICH</span><strong>MVP</strong><i>8 loyiha</i>
        </div>
      </section>

      <section className="login-form-side">
        <form className="login-form" onSubmit={onSubmit}>
          <div className="login-form-heading">
            <span className="mobile-login-logo"><Logo /></span>
            <h2>Xush kelibsiz</h2>
            <p>Ichki boshqaruv tizimiga kirish</p>
          </div>
          <label className="form-field">
            <span>Email manzil</span>
            <div className="input-with-icon">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@startupclub.uz"
                autoComplete="email"
                required
              />
            </div>
          </label>
          <label className="form-field">
            <span>Parol</span>
            <div className="input-with-icon">
              <LockKeyhole size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Parolingizni kiriting"
                autoComplete="current-password"
                required
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <button className="button button-primary login-button" disabled={submitting}>
            {submitting ? 'Tekshirilmoqda...' : 'Tizimga kirish'}
            {!submitting && <ArrowRight size={19} />}
          </button>
          <p className="login-help">Kirishda muammo bormi? Tizim administratoriga murojaat qiling.</p>
        </form>
        <p className="login-footer">© 2026 StartUp Club. Ichki foydalanish uchun.</p>
      </section>
    </main>
  );
}
