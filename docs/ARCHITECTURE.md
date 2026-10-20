# Arxitektura

## Umumiy oqim

```text
Browser
  │  Same-origin /api/backend proxy
  ▼
Next.js web
  │  REST /api/v1
  ▼
NestJS modular monolith
  ├── Auth / RBAC
  ├── Users / Organizations
  ├── Startups / Stages / Notes
  ├── Dashboard
  └── Audit
  │
  ▼
PostgreSQL
```

Frontend bazaga to‘g‘ridan-to‘g‘ri ulanmaydi. Barcha biznes qoidalari API service qatlamida, yaxlitlik qoidalari esa PostgreSQL constraint va foreign key’larda saqlanadi.

## Modular monolith sababi

V1’da mikroservislar deploy, observability va transaction boshqaruvini ortiqcha murakkablashtiradi. NestJS modullari qat’iy chegaralangan, shu sabab kelajakda notification, analytics yoki file processing moduli mustaqil servisga ajratilishi mumkin.

## Tenant modeli

Hozir bitta klub ishlatilsa ham, biznes jadvallarida `organization_id` mavjud. JWT organization va user identifikatorini olib yuradi, ammo har bir so‘rovda foydalanuvchi holati va amaldagi roli bazadan qayta tekshiriladi.

## Startap holati

- `current_stage_id` tezkor list va dashboard so‘rovlari uchun joriy bosqichni saqlaydi.
- `startup_stage_history` har bir o‘tishni immutable tarix sifatida yozadi.
- `status` operatsion holatni bildiradi: faol, to‘xtatilgan, bitirgan yoki arxivlangan.
- Arxivlash hard delete o‘rniga ishlatiladi.

## Xavfsizlik

- Parollar Argon2id yordamida hash qilinadi.
- Access token qisqa muddatli, refresh token serverdagi hash bilan tekshiriladi va rotatsiya qilinadi.
- Tokenlar JavaScript kira olmaydigan HttpOnly cookie’da.
- Rol va account holati har bir himoyalangan so‘rovda bazadan olinadi.
- DTO whitelist ortiqcha input maydonlarini rad etadi.
- Rate limiting va xavfsizlik headerlari global yoqilgan.
- Muhim create/update/archive/stage amallari audit logga tushadi.

## Kengayish nuqtalari

- Redis: queue, cache, notification va rate-limit storage.
- S3/MinIO: pitch deck va hujjatlar.
- Worker: email, eksport va og‘ir hisobotlar.
- Read replica: analitik so‘rovlar oshganda.
- OpenAPI contract generator: tashqi/mobile client paydo bo‘lganda.

