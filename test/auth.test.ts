import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestApp,
  cleanupDatabase,
  seedRolesAndPermissions,
  registerUser,
  getPrisma,
} from './helpers';

describe('AUTH', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
    await seedRolesAndPermissions(app);
  });

  afterAll(async () => {
    await cleanupDatabase(app);
    await app.close();
  });

  beforeEach(async () => {
    await cleanupDatabase(app);
    await seedRolesAndPermissions(app);
  });

  describe('POST /auth/register', () => {
    it('should register a user with CPF', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Test Owner',
          email: 'owner@test.com',
          password: 'password123',
          tenantName: 'Test Clinic',
          tenantAddressLine1: '123 Test St',
          tenantCity: 'São Paulo',
          tenantState: 'SP',
          tenantZipCode: '01234-567',
          tenantDocumentType: 'CPF',
          tenantDocument: '12345678901',
        })
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tenant');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe('owner@test.com');
      expect(response.body.tenant).toHaveProperty('id');
    });

    it('should register a user with CNPJ', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Test Owner',
          email: 'owner@test.com',
          password: 'password123',
          tenantName: 'Test Clinic',
          tenantAddressLine1: '123 Test St',
          tenantCity: 'São Paulo',
          tenantState: 'SP',
          tenantZipCode: '01234-567',
          tenantDocumentType: 'CNPJ',
          tenantDocument: '12345678000190',
        })
        .expect(201);

      expect(response.body.user).toHaveProperty('id');
      expect(response.body.tenant).toHaveProperty('id');
    });

    it('should reject duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Test Owner',
          email: 'owner@test.com',
          password: 'password123',
          tenantName: 'Test Clinic',
          tenantAddressLine1: '123 Test St',
          tenantCity: 'São Paulo',
          tenantState: 'SP',
          tenantZipCode: '01234-567',
          tenantDocumentType: 'CPF',
          tenantDocument: '12345678901',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Test Owner 2',
          email: 'owner@test.com',
          password: 'password456',
          tenantName: 'Test Clinic 2',
          tenantAddressLine1: '456 Test Ave',
          tenantCity: 'Rio de Janeiro',
          tenantState: 'RJ',
          tenantZipCode: '20000-000',
          tenantDocumentType: 'CPF',
          tenantDocument: '98765432100',
        })
        .expect(409);
    });

    it('should reject invalid document type', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Test Owner',
          email: 'owner@test.com',
          password: 'password123',
          tenantName: 'Test Clinic',
          tenantAddressLine1: '123 Test St',
          tenantCity: 'São Paulo',
          tenantState: 'SP',
          tenantZipCode: '01234-567',
          tenantDocumentType: 'INVALID',
          tenantDocument: '12345678901',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Test Owner',
          email: 'owner@test.com',
          password: 'password123',
          tenantName: 'Test Clinic',
          tenantAddressLine1: '123 Test St',
          tenantCity: 'São Paulo',
          tenantState: 'SP',
          tenantZipCode: '01234-567',
          tenantDocumentType: 'CPF',
          tenantDocument: '12345678901',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'owner@test.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tenants');
      expect(response.body.user.email).toBe('owner@test.com');
      expect(response.body.tenants).toHaveLength(1);
    });

    it('should reject invalid password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Test Owner',
          email: 'owner@test.com',
          password: 'password123',
          tenantName: 'Test Clinic',
          tenantAddressLine1: '123 Test St',
          tenantCity: 'São Paulo',
          tenantState: 'SP',
          tenantZipCode: '01234-567',
          tenantDocumentType: 'CPF',
          tenantDocument: '12345678901',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'owner@test.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123',
        })
        .expect(401);
    });

    it('should reject disabled user', async () => {
      const prisma = getPrisma(app);

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Test Owner',
          email: 'owner@test.com',
          password: 'password123',
          tenantName: 'Test Clinic',
          tenantAddressLine1: '123 Test St',
          tenantCity: 'São Paulo',
          tenantState: 'SP',
          tenantZipCode: '01234-567',
          tenantDocumentType: 'CPF',
          tenantDocument: '12345678901',
        })
        .expect(201);

      const user = await prisma.user.findUnique({
        where: { email: 'owner@test.com' },
      });

      await prisma.user.update({
        where: { id: user!.id },
        data: { isActive: false },
      });

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'owner@test.com',
          password: 'password123',
        })
        .expect(401);
    });
  });
});
