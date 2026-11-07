import 'dotenv/config';
import { Algorithm, hash } from '@node-rs/argon2';
import { OrganizationRole, PrismaClient, StartupStatus } from '@prisma/client';

const prisma = new PrismaClient();

const stageSeed = [
  { name: 'G‘oya', slug: 'goya', color: '#8B5CF6', position: 0 },
  { name: 'Validatsiya', slug: 'validatsiya', color: '#0EA5E9', position: 1 },
  { name: 'MVP', slug: 'mvp', color: '#F59E0B', position: 2 },
  { name: 'Pilot', slug: 'pilot', color: '#F97316', position: 3 },
  { name: 'Traction', slug: 'traction', color: '#10B981', position: 4 },
  { name: 'O‘sish', slug: 'osish', color: '#14B8A6', position: 5 },
  { name: 'Bitirgan', slug: 'bitirgan', color: '#334155', position: 6 },
];

async function main() {
  const organizationName = process.env.SEED_ORGANIZATION_NAME || 'StartUp Club';
  const organization = await prisma.organization.upsert({
    where: { slug: 'startup-club' },
    update: { name: organizationName },
    create: {
      name: organizationName,
      slug: 'startup-club',
      description: 'Startaplarni rivojlantirish va boshqarish markazi',
    },
  });

  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@startupclub.uz').toLowerCase();
  const seedPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  if (process.env.NODE_ENV === 'production' && (!process.env.SEED_ADMIN_PASSWORD || seedPassword === 'ChangeMe123!')) {
    throw new Error('Production uchun SEED_ADMIN_PASSWORD majburiy va standart qiymatdan farqli bo‘lishi kerak');
  }
  if (seedPassword.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD kamida 12 belgidan iborat bo‘lishi kerak');
  }
  const admin = await prisma.user.upsert({
    where: { email },
    update: { fullName: process.env.SEED_ADMIN_NAME || 'Tizim administratori' },
    create: {
      email,
      fullName: process.env.SEED_ADMIN_NAME || 'Tizim administratori',
      passwordHash: await hash(seedPassword, {
        algorithm: Algorithm.Argon2id,
        memoryCost: 19_456,
        timeCost: 2,
        parallelism: 1,
        outputLen: 32,
      }),
    },
  });

  // Seed har deployda ishlaydi: mavjud a'zolik va bosqich sozlamalarini qayta yozmaymiz
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: admin.id } },
    update: {},
    create: {
      organizationId: organization.id,
      userId: admin.id,
      role: OrganizationRole.SUPER_ADMIN,
    },
  });

  const stages = [];
  for (const stage of stageSeed) {
    stages.push(
      await prisma.startupStage.upsert({
        where: { organizationId_slug: { organizationId: organization.id, slug: stage.slug } },
        update: {},
        create: { ...stage, organizationId: organization.id },
      }),
    );
  }

  const existingCount = await prisma.startup.count({ where: { organizationId: organization.id } });
  if (existingCount === 0) {
    const samples = [
      {
        name: 'AgroSense',
        slug: 'agrosense',
        description: 'Fermerlar uchun aqlli sug‘orish va hosildorlik monitoringi platformasi.',
        problem: 'Suv sarfi nazorat qilinmaydi va dala holati kech aniqlanadi.',
        solution: 'IoT sensorlar va tahlil paneli orqali real vaqt monitoringi.',
        industry: 'AgriTech',
        location: 'Toshkent',
        teamSize: 5,
        stage: stages[2],
        status: StartupStatus.ACTIVE,
      },
      {
        name: 'EduFlow',
        slug: 'eduflow',
        description: 'O‘quv markazlari uchun ta’lim jarayonini avtomatlashtirish tizimi.',
        problem: 'Davomat, to‘lov va natijalar bir nechta tizimda yuritiladi.',
        solution: 'Barcha jarayonni yagona bulutli panelga birlashtirish.',
        industry: 'EdTech',
        location: 'Samarqand',
        teamSize: 4,
        stage: stages[3],
        status: StartupStatus.ACTIVE,
      },
      {
        name: 'MedLink',
        slug: 'medlink',
        description: 'Bemor va klinikalarni xavfsiz raqamli aloqa bilan bog‘laydi.',
        problem: 'Qabul va tibbiy tarix bo‘yicha aloqa uzilib qoladi.',
        solution: 'Onlayn qabul, eslatma va tibbiy yozuvlar platformasi.',
        industry: 'HealthTech',
        location: 'Toshkent',
        teamSize: 7,
        stage: stages[1],
        status: StartupStatus.PAUSED,
      },
      {
        name: 'GreenPack',
        slug: 'greenpack',
        description: 'Mahalliy xomashyodan ekologik qadoqlash mahsulotlari.',
        problem: 'Bir martalik plastik qadoqlar keng tarqalgan.',
        solution: 'Biologik parchalanadigan arzon mahalliy muqobil.',
        industry: 'CleanTech',
        location: 'Farg‘ona',
        teamSize: 3,
        stage: stages[4],
        status: StartupStatus.ACTIVE,
      },
      {
        name: 'PayWay',
        slug: 'payway',
        description: 'Kichik bizneslar uchun sodda to‘lov va hisob-kitob vositasi.',
        problem: 'Kichik savdogarlar tushumlarni qo‘lda yuritadi.',
        solution: 'Mobil kassaga bog‘langan real vaqt moliyaviy nazorat.',
        industry: 'FinTech',
        location: 'Buxoro',
        teamSize: 6,
        stage: stages[5],
        status: StartupStatus.GRADUATED,
      },
    ];

    for (const [index, sample] of samples.entries()) {
      const startup = await prisma.startup.create({
        data: {
          organizationId: organization.id,
          name: sample.name,
          slug: sample.slug,
          description: sample.description,
          problem: sample.problem,
          solution: sample.solution,
          industry: sample.industry,
          location: sample.location,
          teamSize: sample.teamSize,
          joinedAt: new Date(Date.now() - index * 12 * 86_400_000),
          status: sample.status,
          currentStageId: sample.stage.id,
          curatorId: admin.id,
          createdById: admin.id,
          updatedById: admin.id,
          members: {
            create: [
              {
                fullName: `${sample.name} asoschisi`,
                role: 'CEO & Founder',
                email: `founder@${sample.slug}.uz`,
                isFounder: true,
              },
            ],
          },
        },
      });
      await prisma.startupStageHistory.create({
        data: {
          startupId: startup.id,
          toStageId: sample.stage.id,
          changedById: admin.id,
          note: 'Demo ma’lumot sifatida qo‘shildi',
        },
      });
    }
  }

  console.log(`Seed tayyor. Login: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
