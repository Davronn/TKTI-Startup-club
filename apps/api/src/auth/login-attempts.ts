/**
 * Hisob bo‘yicha (email) noto‘g‘ri urinishlarni cheklaydi.
 * IP bo‘yicha throttling X-Forwarded-For soxtalashtirilsa aylanib o‘tilishi mumkin,
 * shuning uchun bu cheklov IP'ga bog‘liq emas.
 * Eslatma: xotirada saqlanadi — bir nechta API instansiyasida Redis'ga ko‘chirish kerak.
 */
export class LoginAttemptLimiter {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly maxFailures = 10,
    private readonly windowMs = 15 * 60_000,
  ) {}

  /** Bloklangan bo‘lsa, qolgan soniyalarni qaytaradi, aks holda 0. */
  retryAfterSeconds(key: string, now = Date.now()) {
    const entry = this.attempts.get(key);
    if (!entry || entry.resetAt <= now) return 0;
    return entry.count >= this.maxFailures ? Math.ceil((entry.resetAt - now) / 1000) : 0;
  }

  registerFailure(key: string, now = Date.now()) {
    const entry = this.attempts.get(key);
    if (!entry || entry.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + this.windowMs });
    } else {
      entry.count += 1;
    }
    if (this.attempts.size > 10_000) this.prune(now);
  }

  reset(key: string) {
    this.attempts.delete(key);
  }

  private prune(now: number) {
    for (const [key, entry] of this.attempts) {
      if (entry.resetAt <= now) this.attempts.delete(key);
    }
  }
}
