# StartUp Club Platform

Startap klubining ichki boshqaruv tizimi. V1 startaplarni ro‘yxatga olish, rivojlanish bosqichlarini kuzatish, Kanban pipeline, moliyaviy nazorat, foydalanuvchi rollari, izohlar, tarix va dashboardni o‘z ichiga oladi.

## Texnologiyalar

- **Web:** Next.js 16, React 19, TypeScript, TanStack Query
- **API:** NestJS 11, REST API (`/api/v1`), JWT + refresh sessions
- **Database:** PostgreSQL, Prisma ORM
- **Security:** Argon2id, HttpOnly/SameSite cookie, CSRF himoyasi, server-side sessiya tekshiruvi, RBAC, rate limiting, Helmet/CSP, audit log
- **Infrastructure:** Turborepo, Docker Compose, Redis va MinIO uchun tayyor servislar

## V1 imkoniyatlari

- Email/parol orqali xavfsiz kirish va sessiyani yangilash
- Super admin, admin, menejer va kuzatuvchi rollari
- Startap yaratish, tahrirlash, filtrlash va arxivlash
- Jamoa a’zolari, kurator, aloqa va loyiha ma’lumotlari
- Sozlanadigan rivojlanish bosqichlari
- Drag-and-drop Kanban pipeline
- Bosqichlar o‘zgarishining to‘liq tarixi
- Milestone va vazifalar: muddat, ustuvorlik, mas’ul, holat va progress
- Ichki izohlar
- Dashboard, bosqichlar kesimidagi ko‘rsatkichlar va muddati o‘tgan vazifalar ogohlantirishi
- Har bir startap uchun kirim, chiqim va moliyalashtirish operatsiyalari
- Ko‘p valutali hisob, bazaviy valuta kursi, budjet, burn rate va runway
- Investitsiya raundlari, jalb qilingan mablag‘, baholash va berilgan ulush nazorati
- Kontragent, to‘lov usuli, chek/hujjat havolasi va moliyaviy audit tarixi
- CSV eksport
- Multi-tenantga tayyor `organization_id` modeli
- Filtrlanadigan audit jurnali, arxivlash va arxivdan tiklash
- Foydalanuvchi parolini o‘zi almashtirishi, faol qurilmalar/sessiyalarni ko‘rishi va masofadan yopishi
- Admin tomonidan xavfsiz parol reseti va barcha sessiyalarni darhol bekor qilish

## Tez ishga tushirish

### 1. Muhit fayli

PowerShell:

```powershell
Copy-Item .env.example apps/api/.env
```

`apps/api/.env` ichidagi `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` va boshlang‘ich admin parolini albatta almashtiring. Har bir JWT secret kamida 32 belgi va bir-biridan farqli bo‘lishi kerak.

### 2. PostgreSQL

Docker o‘rnatilgan bo‘lsa:

```powershell
docker compose up -d postgres redis minio
```

Docker bo‘lmasa, mahalliy yoki managed PostgreSQL yarating va `apps/api/.env` ichidagi `DATABASE_URL`ni yangilang. Redis va MinIO V1 core oqimi uchun majburiy emas.

### 3. Ilovani tayyorlash

```powershell
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

- Frontend: `http://localhost:3000`
- API: `http://localhost:4000/api/v1`
- Health check: `http://localhost:4000/api/v1/health`

Seed login `.env` orqali belgilanadi. Default qiymatlar faqat lokal development uchun:

- Email: `admin@startupclub.uz`
- Parol: `ChangeMe123!`

Bu parol faqat lokal development uchun. Production’da ishlatmang.

## Production build

```powershell
npm run build
npm run start -w @startup-club/api
npm run start -w @startup-club/web
```

Render konfiguratsiyasida web va API bitta servis jarayonida ishlaydi. Katta production muhitida ularni alohida servis/containerlarga ajratish mumkin. Next.js `API_INTERNAL_URL` orqali API’ga proxy qiladi; brauzer backend manziliga to‘g‘ridan-to‘g‘ri ulanmaydi.

## Vaqtinchalik serverga deploy

Repository root'idagi `render.yaml` Render'da Next.js, NestJS va PostgreSQL'ni yaratadi. `main` branch'ga har bir push avtomatik deployni ishga tushiradi.

Batafsil qo'llanma: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

## Database jarayoni

Schema: `apps/api/prisma/schema.prisma`

Har bir o‘zgarishda:

```powershell
npm run db:migrate -- --name meaningful_change_name
npm run db:generate
```

Migration fayllari Git’ga commit qilinadi. Production’da `npm run db:deploy` ishlatiladi; `db push` ishlatilmaydi.

## Repository

```text
apps/
  api/       NestJS API va Prisma schema
  web/       Next.js admin panel
docs/
  ARCHITECTURE.md
  ROADMAP.md
```

## Muhim production talablari

- Development, staging va production bazalarini ajrating.
- Managed PostgreSQL backup/PITR’ni yoqing.
- HTTPS va `NODE_ENV=production` ishlating.
- JWT secretlarni secret manager’da saqlang.
- Default admin parolini birinchi deploydan oldin almashtiring.
- CI’da `npm audit --omit=dev`, build va migration tekshiruvini majburiy qiling.

To‘liq production checklist va zaifliklarni xabar qilish tartibi: [`SECURITY.md`](SECURITY.md).

