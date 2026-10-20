# Git va Render orqali deploy

Bu konfiguratsiya vaqtinchalik demo muhit uchun mo‘ljallangan. Next.js web ilovasi va NestJS API bitta Render web servisida, PostgreSQL esa Render managed database sifatida ishlaydi.

## 1. GitHub repozitoriyga yuborish

GitHub’da bo‘sh repository yarating. `README`, `.gitignore` yoki License’ni GitHub tomonda yaratmang, chunki ular loyihada mavjud.

```bash
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

## 2. Render Blueprint yaratish

1. [Render Dashboard](https://dashboard.render.com/) orqali GitHub hisobini ulang.
2. `New` → `Blueprint` ni tanlang.
3. GitHub’dagi loyiha repositorysini tanlang.
4. Render root’dagi `render.yaml` faylini avtomatik topadi.
5. `SEED_ADMIN_PASSWORD` maydoniga kamida 12 belgili kuchli parol kiriting.
6. Blueprint yaratishni tasdiqlang va deploy tugashini kuting.

Deploy tugagach, loyiha `https://tkti-startup-club.onrender.com` manzilida ochiladi. Agar Render servis nomiga qo‘shimcha suffix qo‘shsa, Dashboard ko‘rsatgan URL’dan foydalaning.

## 3. Avtomatik yangilanish

`main` branch’ga yuborilgan har bir commit Render’da avtomatik build va deploy boshlaydi:

```bash
git add .
git commit -m "feat: yangi imkoniyat"
git push
```

Deploy vaqtida Prisma migration va seed avtomatik bajariladi. Seed mavjud admin parolini yoki mavjud startaplarni o‘zgartirmaydi.

## Muhim cheklovlar

- Free web service 15 daqiqa faollik bo‘lmasa uxlaydi; birinchi ochilish bir daqiqagacha cho‘zilishi mumkin.
- Free PostgreSQL 30 kundan keyin tugaydi va unda backup yo‘q.
- Bu muhit demo/sinov uchun. Doimiy real foydalanishdan oldin database va web service’ni pullik tarifga o‘tkazing yoki boshqa production infratuzilmaga ko‘chiring.
- `.env` fayllari Git’ga yuborilmaydi. Production secretlari faqat Render Dashboard’da saqlanadi.
