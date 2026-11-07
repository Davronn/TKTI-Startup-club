'use client';

import { useCallback, useEffect } from 'react';

export const UNSAVED_MESSAGE = 'Kiritilgan o‘zgarishlar saqlanmagan. Sahifadan chiqib ketsangiz, ular yo‘qoladi. Davom etasizmi?';

/**
 * Formada saqlanmagan o‘zgarish bo‘lsa, foydalanuvchini ogohlantiradi:
 * brauzer yopilishi/yangilanishi (beforeunload) va sayt ichidagi havolalarga bosish.
 * Qaytaradigan funksiyasi "Bekor qilish" kabi dasturiy o‘tishlarda ishlatiladi.
 */
export function useUnsavedChanges(dirty: boolean, message = UNSAVED_MESSAGE) {
  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Eski brauzerlar uchun
      event.returnValue = '';
    };

    // Capture bosqichida ushlaymiz: Next.js <Link> o‘z onClick'ini React ildizida ishlatadi
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return; // tashqi sayt: beforeunload o‘zi so‘raydi
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty, message]);

  /** Dasturiy o‘tishdan oldin: true qaytsa, davom etish mumkin. */
  return useCallback(() => !dirty || window.confirm(message), [dirty, message]);
}
