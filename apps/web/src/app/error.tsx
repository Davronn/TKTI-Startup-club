'use client';

import { useEffect } from 'react';
import { Logo } from '@/components/logo';

/** Kutilmagan xato: oq ekran o‘rniga tushunarli xabar va qayta urinish. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="system-page">
      <section className="system-panel">
        <div className="login-logo"><Logo /></div>
        <span className="system-code">Xato</span>
        <h1>Nimadir noto‘g‘ri ketdi</h1>
        <p>Sahifani ko‘rsatishda kutilmagan xato yuz berdi. Qayta urinib ko‘ring; muammo takrorlansa, administratorga xabar bering.</p>
        {error.digest && <p className="system-digest">Xato kodi: {error.digest}</p>}
        <div className="system-actions">
          <button type="button" className="button button-primary" onClick={reset}>Qayta urinish</button>
          <a href="/dashboard" className="button button-secondary">Boshqaruv paneli</a>
        </div>
      </section>
    </main>
  );
}
