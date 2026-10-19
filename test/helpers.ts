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
  selectionToken: string;
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
  await prisma.diagnosis.deleteMany();
  await prisma.consultation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.animalVaccination.deleteMany();
  await prisma.animalMedication.deleteMany();
  await prisma.animalAllergy.deleteMany();
  await prisma.animalWeightRecord.deleteMany();
  await prisma.animalTutor.deleteMany();
  await prisma.tenantAnimal.deleteMany();
  await prisma.animal.deleteMany();
  await prisma.vaccine.deleteMany();
  await prisma.allergy.deleteMany();
  await prisma.medication.deleteMany();
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
  // Catálogo global criado por teste (upsert): sem isso as linhas
  // acumulam no banco de desenvolvimento entre as rodadas da suíte.
  await prisma.breed.deleteMany();
  await prisma.species.deleteMany();
  await prisma.specialty.deleteMany();
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
    { key: 'USER_MANAGE', resource: 'USER', action: 'MANAGE' },
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
    // Permissões do domínio clínico (P1-a)
    { key: 'APPOINTMENT_CREATE', resource: 'APPOINTMENT', action: 'CREATE' },
    { key: 'APPOINTMENT_READ', resource: 'APPOINTMENT', action: 'READ' },
    { key: 'APPOINTMENT_UPDATE', resource: 'APPOINTMENT', action: 'UPDATE' },
    { key: 'CONSULTATION_CREATE', resource: 'CONSULTATION', action: 'CREATE' },
    { key: 'CONSULTATION_READ', resource: 'CONSULTATION', action: 'READ' },
    { key: 'CONSULTATION_UPDATE', resource: 'CONSULTATION', action: 'UPDATE' },
    { key: 'DIAGNOSIS_CREATE', resource: 'DIAGNOSIS', action: 'CREATE' },
    { key: 'DIAGNOSIS_READ', resource: 'DIAGNOSIS', action: 'READ' },
    { key: 'DIAGNOSIS_UPDATE', resource: 'DIAGNOSIS', action: 'UPDATE' },
    { key: 'DIAGNOSIS_DEACTIVATE', resource: 'DIAGNOSIS', action: 'DEACTIVATE' },
    { key: 'ANIMAL_WEIGHT_RECORD_CREATE', resource: 'ANIMAL_WEIGHT_RECORD', action: 'CREATE' },
    { key: 'ANIMAL_WEIGHT_RECORD_READ', resource: 'ANIMAL_WEIGHT_RECORD', action: 'READ' },
    { key: 'ANIMAL_ALLERGY_CREATE', resource: 'ANIMAL_ALLERGY', action: 'CREATE' },
    { key: 'ANIMAL_ALLERGY_READ', resource: 'ANIMAL_ALLERGY', action: 'READ' },
    { key: 'ANIMAL_MEDICATION_CREATE', resource: 'ANIMAL_MEDICATION', action: 'CREATE' },
    { key: 'ANIMAL_MEDICATION_READ', resource: 'ANIMAL_MEDICATION', action: 'READ' },
    { key: 'ANIMAL_VACCINATION_CREATE', resource: 'ANIMAL_VACCINATION', action: 'CREATE' },
    { key: 'ANIMAL_VACCINATION_READ', resource: 'ANIMAL_VACCINATION', action: 'READ' },
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
      // Gestão de usuários e vínculos (2026-10-19)
      'USER_MANAGE',
      // Domínio clínico (P1-a)
      'APPOINTMENT_CREATE',
      'APPOINTMENT_READ',
      'APPOINTMENT_UPDATE',
      'CONSULTATION_CREATE',
      'CONSULTATION_READ',
      'CONSULTATION_UPDATE',
      'DIAGNOSIS_CREATE',
      'DIAGNOSIS_READ',
      'DIAGNOSIS_UPDATE',
      'DIAGNOSIS_DEACTIVATE',
      'ANIMAL_WEIGHT_RECORD_CREATE',
      'ANIMAL_WEIGHT_RECORD_READ',
      'ANIMAL_ALLERGY_CREATE',
      'ANIMAL_ALLERGY_READ',
      'ANIMAL_MEDICATION_CREATE',
      'ANIMAL_MEDICATION_READ',
      'ANIMAL_VACCINATION_CREATE',
      'ANIMAL_VACCINATION_READ',
    ],
    VETERINARIAN: [
      'ANIMAL_CREATE',
      'ANIMAL_READ',
      'ANIMAL_UPDATE',
      'ANIMAL_DEACTIVATE',
      'TUTOR_CREATE',
      'TUTOR_READ',
      'TUTOR_UPDATE',
      // Domínio clínico (P1-a)
      'APPOINTMENT_CREATE',
      'APPOINTMENT_READ',
      'APPOINTMENT_UPDATE',
      'CONSULTATION_CREATE',
      'CONSULTATION_READ',
      'CONSULTATION_UPDATE',
      'DIAGNOSIS_CREATE',
      'DIAGNOSIS_READ',
      'DIAGNOSIS_UPDATE',
      'DIAGNOSIS_DEACTIVATE',
      'ANIMAL_WEIGHT_RECORD_CREATE',
      'ANIMAL_WEIGHT_RECORD_READ',
      'ANIMAL_ALLERGY_CREATE',
      'ANIMAL_ALLERGY_READ',
      'ANIMAL_MEDICATION_CREATE',
      'ANIMAL_MEDICATION_READ',
      'ANIMAL_VACCINATION_CREATE',
      'ANIMAL_VACCINATION_READ',
    ],
    RECEPTIONIST: [
      'ANIMAL_CREATE',
      'ANIMAL_READ',
      'ANIMAL_UPDATE',
      'ANIMAL_DEACTIVATE',
      'TUTOR_CREATE',
      'TUTOR_READ',
      'TUTOR_UPDATE',
      // Domínio clínico (P1-a): agendamento e leitura de registros clínicos
      'APPOINTMENT_CREATE',
      'APPOINTMENT_READ',
      'APPOINTMENT_UPDATE',
      'ANIMAL_WEIGHT_RECORD_READ',
      'ANIMAL_ALLERGY_READ',
      'ANIMAL_MEDICATION_READ',
      'ANIMAL_VACCINATION_READ',
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

export async function setUserRole(
  app: INestApplication,
  user: { userId: string; tenantId: string },
  roleName: 'ADMIN' | 'VETERINARIAN' | 'RECEPTIONIST',
): Promise<void> {
  const prisma = getPrisma(app);

  const userTenant = await prisma.userTenant.findFirstOrThrow({
    where: {
      userId: user.userId,
      tenantId: user.tenantId,
    },
  });

  const role = await prisma.role.findUniqueOrThrow({
    where: { name: roleName },
  });

  await prisma.userTenantRole.deleteMany({
    where: { userTenantId: userTenant.id },
  });

  await prisma.userTenantRole.create({
    data: {
      userTenantId: userTenant.id,
      roleId: role.id,
    },
  });
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

  const loginResponse = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({
      email: data.email,
      password: data.password,
    });

  const selectionToken = loginResponse.body.selectionToken;

  const selectResponse = await request(app.getHttpServer())
    .post('/api/auth/select-tenant')
    .set('Authorization', `Bearer ${selectionToken}`)
    .send({
      tenantId: response.body.tenant.id,
    });

  return {
    userId: response.body.user.id,
    tenantId: response.body.tenant.id,
    accessToken: selectResponse.body.accessToken,
    refreshToken: extractRefreshTokenFromResponse(selectResponse) || '',
    selectionToken,
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

/**
 * Collator usado para reproduzir a ordenação que o PostgreSQL aplica aos
 * catálogos da API.
 */
const nameCollator = new Intl.Collator('pt-BR', { sensitivity: 'variant' });

/**
 * Ordena nomes na mesma ordem em que a API os devolve.
 *
 * A API ordena os catálogos com `ORDER BY name`, ou seja, usando a collation
 * do banco (en_US.utf8, padrão da imagem postgres:16), que compara nomes de
 * forma linguística: 'Árabe' é ordenado como 'Arabe' e 'Cão' como 'Cao'.
 *
 * O `sort()` padrão do JavaScript compara code units UTF-16 e jogaria nomes
 * acentuados para o fim da lista ('Árabe' depois de 'Siamês'), o que não é o
 * que a API devolve. Testes de ordenação de catálogo devem usar esta função.
 */
export function sortByName<T extends string>(names: T[]): T[] {
  return [...names].sort(nameCollator.compare);
}
