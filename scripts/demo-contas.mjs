// Cria/atualiza as contas de demonstração por papel na clínica demo.
// Uso: node scripts/demo-contas.mjs
// Senha de todas: senha12345
//
// A clínica alvo é a do usuário demo.96106104124@vet.dev (a que o
// frontend/scripts/demo-data.mjs imprime). Se ele não existir, usa a clínica
// com mais agendamentos.
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const PASSWORD = 'senha12345';
const DEMO_EMAIL = 'demo.96106104124@vet.dev';

const CONTAS = [
  { role: 'ADMIN', name: 'Marina Alves', email: 'admin@demo.vet', vincularVeterinario: null },
  {
    role: 'VETERINARIAN',
    name: 'Dr. Carlos Mendes',
    email: 'vet@demo.vet',
    vincularVeterinario: 'Dr. Carlos Mendes',
  },
  { role: 'RECEPTIONIST', name: 'Bianca Rocha', email: 'recepcao@demo.vet', vincularVeterinario: null },
];

async function main() {
  const demoUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  let tenant = null;

  if (demoUser) {
    const link = await prisma.userTenant.findFirst({
      where: { userId: demoUser.id, status: 'ACTIVE' },
      include: { tenant: true },
    });
    tenant = link?.tenant ?? null;
  }

  if (!tenant) {
    const tenants = await prisma.tenant.findMany({
      include: { _count: { select: { appointments: true } } },
      orderBy: { appointments: { _count: 'desc' } },
      take: 1,
    });
    tenant = tenants[0] ?? null;
  }

  if (!tenant) throw new Error('Nenhuma clínica encontrada');

  const passwordHash = await argon2.hash(PASSWORD);
  const emails = CONTAS.map((c) => c.email);

  for (const conta of CONTAS) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: conta.role } });

    const user = await prisma.user.upsert({
      where: { email: conta.email },
      update: { name: conta.name, passwordHash, isActive: true },
      create: { name: conta.name, email: conta.email, passwordHash },
    });

    const link = await prisma.userTenant.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      update: { status: 'ACTIVE', acceptedAt: new Date() },
      create: { userId: user.id, tenantId: tenant.id, status: 'ACTIVE', acceptedAt: new Date() },
    });

    await prisma.userTenantRole.upsert({
      where: { userTenantId_roleId: { userTenantId: link.id, roleId: role.id } },
      update: {},
      create: { userTenantId: link.id, roleId: role.id },
    });

    // Remove vínculos dessas contas em outras clínicas (demo antiga com mesmo nome).
    const outros = await prisma.userTenant.findMany({
      where: { userId: user.id, tenantId: { not: tenant.id } },
      select: { id: true },
    });
    if (outros.length > 0) {
      await prisma.userTenantRole.deleteMany({
        where: { userTenantId: { in: outros.map((o) => o.id) } },
      });
      await prisma.userTenant.deleteMany({ where: { id: { in: outros.map((o) => o.id) } } });
    }

    if (conta.vincularVeterinario) {
      const vetLink = await prisma.tenantVeterinarian.findFirst({
        where: {
          tenantId: tenant.id,
          veterinarian: { name: conta.vincularVeterinario },
        },
        include: { veterinarian: true },
      });
      if (vetLink) {
        // A conta pode ter ficado vinculada a um Veterinarian de outra clínica
        // demo; userId é único, então limpa antes de apontar para o correto.
        await prisma.veterinarian.updateMany({
          where: { userId: user.id, id: { not: vetLink.veterinarian.id } },
          data: { userId: null },
        });
        await prisma.veterinarian.update({
          where: { id: vetLink.veterinarian.id },
          data: { userId: user.id },
        });
      }
    }

    console.log(`${conta.role.padEnd(12)} ${conta.email.padEnd(20)} ${PASSWORD}`);
  }

  const counts = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    include: { _count: { select: { appointments: true, tenantAnimals: true } } },
  });
  console.log(`\nClínica: ${tenant.name} (${tenant.id})`);
  console.log(`  agendamentos: ${counts._count.appointments} | animais: ${counts._count.tenantAnimals}`);
  console.log(`  contas demo: ${emails.join(', ')}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
