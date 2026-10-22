# Xavfsizlik siyosati

## Zaiflik haqida xabar berish

Xavfsizlik muammosini public issue sifatida ochmang. Repository egasiga muammo tavsifi, qayta chiqarish qadamlari, ta’sir doirasi va mavjud bo‘lsa tavsiya etilgan yechimni private kanal orqali yuboring. Tasdiqlanmaguncha real foydalanuvchi ma’lumotlari ustida sinov qilmang.

## Production nazorat ro‘yxati

- `JWT_ACCESS_SECRET` va `JWT_REFRESH_SECRET` kamida 32 belgili, tasodifiy va bir-biridan farqli bo‘lsin.
- `SEED_ADMIN_PASSWORD` kamida 12 belgili noyob parol bo‘lsin; birinchi kirishdan keyin panel orqali almashtirilsin.
- Faqat HTTPS ishlatilsin; secretlar Git’ga emas, hosting secret manager’iga yozilsin.
- PostgreSQL avtomatik backup/PITR va alohida production database bilan ishlasin.
- GitHub Actions’dagi build, test va production dependency audit muvaffaqiyatli o‘tmasdan deploy qilinmasin.
- Adminlar soni minimal bo‘lsin; audit jurnali muntazam tekshirilsin; ishlamaydigan foydalanuvchilar bloklansin.
- Render free database real production uchun ishlatilmasin: uning retention va backup kafolati yetarli emas.

## Himoya qatlamlari

Tizim Argon2id parol hash’i, HttpOnly/SameSite cookie, refresh token rotatsiyasi, server-side sessiya revokatsiyasi, Origin + CSRF token tekshiruvi, RBAC, tenant filtrlari, DTO whitelist, rate limiting, CSP/Helmet headerlari va audit jurnalidan foydalanadi.

## Chegaralar

V1’da email orqali parol tiklash, MFA, markazlashgan Redis rate-limit va fayllarni antivirus tekshiruvi hali yo‘q. Ular public ro‘yxatdan o‘tish yoki tashqi foydalanuvchi kabineti yoqilishidan oldin qo‘shilishi kerak.
