'use client';

import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Logo } from '@/components/logo';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      <div className="login-orb login-orb-one" aria-hidden="true" />
      <div className="login-orb login-orb-two" aria-hidden="true" />

      <section className="login-panel">
        <header className="login-form-heading">
          <div className="login-logo"><Logo /></div>
          <span className="login-kicker">STARTUP CLUB PLATFORM</span>
          <h1>Tizimga kirish</h1>
          <p>Ichki boshqaruv paneliga kirish uchun ma’lumotlaringizni kiriting.</p>
        </header>

        <form className="login-form" onSubmit={onSubmit}>
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
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <button className="button button-primary login-button" disabled={submitting}>
            {submitting ? 'Tekshirilmoqda...' : 'Tizimga kirish'}
            {!submitting && <ArrowRight size={19} />}
          </button>
        </form>

        <p className="login-help">Kirishda muammo bo‘lsa, tizim administratoriga murojaat qiling.</p>
        <footer className="login-footer">© 2026 StartUp Club · Ichki foydalanish uchun</footer>
      </section>
    </main>
  );
}
