import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app/app.module';
import { TestModule } from '../src/test/test.module';
import { PrismaService } from '../src/prisma';

export interface TestUser {
  userId: string;
  tenantId: string;
  accessToken: string;
  refreshToken: string;
}

let prismaInstance: PrismaService;
let userCounter = 0;

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule, TestModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  await app.init();

  prismaInstance = app.get(PrismaService);

  return app;
}

export function getPrisma(app: INestApplication): PrismaService {
  if (!prismaInstance) {
    prismaInstance = app.get(PrismaService);
  }
  return prismaInstance;
}

export async function cleanupDatabase(app: INestApplication): Promise<void> {
  const prisma = getPrisma(app);

  await prisma.session.deleteMany();
  await prisma.userTenantRole.deleteMany();
  await prisma.userTenant.deleteMany();
  await prisma.animalWeightRecord.deleteMany();
  await prisma.animalTutor.deleteMany();
  await prisma.tenantAnimal.deleteMany();
  await prisma.animal.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.tutor.deleteMany();
  await prisma.tutorIdentity.deleteMany();
  await prisma.veterinarianSpecialty.deleteMany();
  await prisma.tenantVeterinarian.deleteMany();
  await prisma.veterinarian.deleteMany();
}

export async function seedRolesAndPermissions(
  app: INestApplication,
): Promise<void> {
  const prisma = getPrisma(app);

  const roles = ['ADMIN', 'VETERINARIAN', 'RECEPTIONIST'];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const permissions = [
    { key: 'ANIMAL_CREATE', resource: 'ANIMAL', action: 'CREATE' },
    { key: 'ANIMAL_READ', resource: 'ANIMAL', action: 'READ' },
    { key: 'ANIMAL_UPDATE', resource: 'ANIMAL', action: 'UPDATE' },
    { key: 'ANIMAL_DEACTIVATE', resource: 'ANIMAL', action: 'DEACTIVATE' },
    { key: 'TUTOR_CREATE', resource: 'TUTOR', action: 'CREATE' },
    { key: 'TUTOR_READ', resource: 'TUTOR', action: 'READ' },
    { key: 'TUTOR_UPDATE', resource: 'TUTOR', action: 'UPDATE' },
    { key: 'TUTOR_DEACTIVATE', resource: 'TUTOR', action: 'DEACTIVATE' },
    { key: 'VETERINARIAN_CREATE', resource: 'VETERINARIAN', action: 'CREATE' },
    { key: 'VETERINARIAN_READ', resource: 'VETERINARIAN', action: 'READ' },
    { key: 'VETERINARIAN_UPDATE', resource: 'VETERINARIAN', action: 'UPDATE' },
    { key: 'VETERINARIAN_DEACTIVATE', resource: 'VETERINARIAN', action: 'DEACTIVATE' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: {},
      create: perm,
    });
  }

  const rolePermissions: Record<string, string[]> = {
    ADMIN: [
      'ANIMAL_CREATE',
      'ANIMAL_READ',
      'ANIMAL_UPDATE',
      'ANIMAL_DEACTIVATE',
      'TUTOR_CREATE',
      'TUTOR_READ',
      'TUTOR_UPDATE',
      'TUTOR_DEACTIVATE',
      'VETERINARIAN_CREATE',
      'VETERINARIAN_READ',
      'VETERINARIAN_UPDATE',
      'VETERINARIAN_DEACTIVATE',
    ],
    VETERINARIAN: [
      'ANIMAL_CREATE',
      'ANIMAL_READ',
      'ANIMAL_UPDATE',
      'ANIMAL_DEACTIVATE',
      'TUTOR_CREATE',
      'TUTOR_READ',
      'TUTOR_UPDATE',
    ],
    RECEPTIONIST: [
      'ANIMAL_CREATE',
      'ANIMAL_READ',
      'ANIMAL_UPDATE',
      'ANIMAL_DEACTIVATE',
      'TUTOR_CREATE',
      'TUTOR_READ',
      'TUTOR_UPDATE',
    ],
  };

  for (const [roleName, permissionKeys] of Object.entries(rolePermissions)) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: roleName },
    });

    for (const permKey of permissionKeys) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { key: permKey },
      });

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }
}

function generateUniqueCPF(): string {
  userCounter++;
  const base = String(userCounter).padStart(9, '0');
  return `${base}0001`;
}

export async function registerUser(
  app: INestApplication,
  data: {
    email: string;
    password: string;
    tenantDocumentType?: 'CPF' | 'CNPJ';
    tenantDocument?: string;
  },
): Promise<TestUser> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({
      name: 'Test User',
      email: data.email,
      password: data.password,
      tenantName: 'Test Clinic',
      tenantAddressLine1: '123 Test St',
      tenantCity: 'São Paulo',
      tenantState: 'SP',
      tenantZipCode: '01234-567',
      tenantDocumentType: data.tenantDocumentType || 'CPF',
      tenantDocument: data.tenantDocument || generateUniqueCPF(),
    });

  const selectResponse = await request(app.getHttpServer())
    .post('/api/auth/select-tenant')
    .send({
      userId: response.body.user.id,
      tenantId: response.body.tenant.id,
    });

  return {
    userId: response.body.user.id,
    tenantId: response.body.tenant.id,
    accessToken: selectResponse.body.accessToken,
    refreshToken: extractRefreshTokenFromResponse(selectResponse) || '',
  };
}

export function extractRefreshTokenFromResponse(
  response: request.Response,
): string | undefined {
  const cookies = response.headers['set-cookie'];
  if (!cookies) return undefined;

  const refreshCookie = cookies.find((c: string) =>
    c.startsWith('refresh_token='),
  );

  return refreshCookie?.split(';')[0]?.split('=')[1];
}

export function parseJwtPayload(token: string): any {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''),
  );

  return JSON.parse(jsonPayload);
}
