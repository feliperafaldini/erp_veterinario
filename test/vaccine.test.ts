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

describe('VACCINES', () => {
  let app: INestApplication;
  let vaccineId: string;

  beforeAll(async () => {
    app = await createTestApp();
    await seedRolesAndPermissions(app);

    const prisma = getPrisma(app);

    const vaccine = await prisma.vaccine.upsert({
      where: { name: 'Vacina antirrábica' },
      update: {},
      create: {
        name: 'Vacina antirrábica',
        description: 'Proteção contra raiva',
      },
    });
    vaccineId = vaccine.id;

    await prisma.vaccine.upsert({
      where: { name: 'Vacina tríplice felina' },
      update: {},
      create: {
        name: 'Vacina tríplice felina',
        description: 'Proteção contra panleucopenia, calicivírus e herpesvírus felino',
      },
    });
  });

  afterAll(async () => {
    await cleanupDatabase(app);
    await app.close();
  });

  beforeEach(async () => {
    await cleanupDatabase(app);
    await seedRolesAndPermissions(app);

    const prisma = getPrisma(app);

    const vaccine = await prisma.vaccine.upsert({
      where: { name: 'Vacina antirrábica' },
      update: {},
      create: {
        name: 'Vacina antirrábica',
        description: 'Proteção contra raiva',
      },
    });
    vaccineId = vaccine.id;

    await prisma.vaccine.upsert({
      where: { name: 'Vacina tríplice felina' },
      update: {},
      create: {
        name: 'Vacina tríplice felina',
        description: 'Proteção contra panleucopenia, calicivírus e herpesvírus felino',
      },
    });
  });

  describe('GET /api/vaccines', () => {
    it('should list all vaccines for authenticated user', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/vaccines')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      const names = response.body.map((v: any) => v.name);
      expect(names).toContain('Vacina antirrábica');
      expect(names).toContain('Vacina tríplice felina');
    });

    it('should return vaccines ordered by name', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/vaccines')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const names = response.body.map((v: any) => v.name);
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    });

    it('should return id, name, description, and createdAt', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/vaccines')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      const vaccine = response.body.find((v: any) => v.name === 'Vacina antirrábica');
      expect(vaccine).toBeDefined();
      expect(vaccine).toHaveProperty('id');
      expect(vaccine).toHaveProperty('name');
      expect(vaccine).toHaveProperty('description');
      expect(vaccine).toHaveProperty('createdAt');
      expect(vaccine.description).toBe('Proteção contra raiva');
    });
  });

  describe('GET /api/vaccines/:id', () => {
    it('should return vaccine by id', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get(`/api/vaccines/${vaccineId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(vaccineId);
      expect(response.body.name).toBe('Vacina antirrábica');
      expect(response.body.description).toBe('Proteção contra raiva');
    });

    it('should return 404 for nonexistent id', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/vaccines/${fakeId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });

    it('should return 400 for invalid uuid format', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .get('/api/vaccines/invalid-id')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(400);
    });
  });

  describe('Authentication', () => {
    it('should return 401 without access token', async () => {
      await request(app.getHttpServer()).get('/api/vaccines').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/vaccines')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);
    });
  });

  describe('Tenant guard', () => {
    it('should return 403 for suspended user', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await prisma.userTenant.updateMany({
        where: {
          userId: user.userId,
          tenantId: user.tenantId,
        },
        data: { status: 'SUSPENDED' },
      });

      await request(app.getHttpServer())
        .get('/api/vaccines')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });

    it('should return 403 for revoked user', async () => {
      const prisma = getPrisma(app);

      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await prisma.userTenant.updateMany({
        where: {
          userId: user.userId,
          tenantId: user.tenantId,
        },
        data: { status: 'REVOKED' },
      });

      await request(app.getHttpServer())
        .get('/api/vaccines')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });

  describe('Vaccines is global', () => {
    it('should return the same vaccines to different tenants', async () => {
      const user1 = await registerUser(app, {
        email: 'clinic1@test.com',
        password: 'password123',
      });

      const user2 = await registerUser(app, {
        email: 'clinic2@test.com',
        password: 'password123',
      });

      const response1 = await request(app.getHttpServer())
        .get('/api/vaccines')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/api/vaccines')
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(200);

      const ids1 = response1.body.map((v: any) => v.id).sort();
      const ids2 = response2.body.map((v: any) => v.id).sort();

      expect(ids1).toEqual(ids2);
      expect(ids1.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('No mutation endpoints', () => {
    it('should return 404 for POST /api/vaccines', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/api/vaccines')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });

    it('should return 404 for PATCH /api/vaccines/:id', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .patch(`/api/vaccines/${vaccineId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });

    it('should return 404 for DELETE /api/vaccines/:id', async () => {
      const user = await registerUser(app, {
        email: 'test@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .delete(`/api/vaccines/${vaccineId}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(404);
    });
  });
});
