import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestApp,
  cleanupDatabase,
  seedRolesAndPermissions,
  registerUser,
  getPrisma,
  setUserRole,
} from './helpers';

describe('USERS', () => {
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

  describe('GET /api/users', () => {
    it('should list only users linked to the current tenant', async () => {
      const adminA = await registerUser(app, {
        email: 'admin-a@test.com',
        password: 'password123',
      });
      const adminB = await registerUser(app, {
        email: 'admin-b@test.com',
        password: 'password123',
      });

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminA.accessToken}`)
        .expect(200);

      const emails = response.body.map((u: any) => u.email);
      expect(emails).toContain('admin-a@test.com');
      expect(emails).not.toContain('admin-b@test.com');

      const me = response.body.find(
        (u: any) => u.email === 'admin-a@test.com',
      );
      expect(me.status).toBe('ACTIVE');
      expect(me.isActive).toBe(true);
      expect(me.roles).toContain('ADMIN');
    });

    it('should return 403 without USER_MANAGE', async () => {
      const admin = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });
      const reception = await registerUser(app, {
        email: 'recepcao@test.com',
        password: 'password123',
      });

      await setUserRole(app, reception, 'RECEPTIONIST');

      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${reception.accessToken}`)
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/api/users').expect(401);
    });
  });

  describe('PATCH /api/users/:id/suspend | revoke | restore', () => {
    it('should suspend the link, revoke that tenant sessions and keep other tenants intact', async () => {
      const prisma = getPrisma(app);

      // adminA administra tenantA; target tem vínculo em tenantA e no
      // próprio tenant (tenantX) — suspensão em A não pode estourar em X.
      const adminA = await registerUser(app, {
        email: 'admin-a@test.com',
        password: 'password123',
      });
      const target = await registerUser(app, {
        email: 'target@test.com',
        password: 'password123',
      });

      await prisma.userTenant.create({
        data: {
          userId: target.userId,
          tenantId: adminA.tenantId,
          status: 'ACTIVE',
          acceptedAt: new Date(),
        },
      });

      // sessão do target em tenantA (login + seleção de tenant)
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'target@test.com', password: 'password123' })
        .expect(200);

      const select = await request(app.getHttpServer())
        .post('/api/auth/select-tenant')
        .set('Authorization', `Bearer ${login.body.selectionToken}`)
        .send({ tenantId: adminA.tenantId })
        .expect(201);

      const targetTokenInA = select.body.accessToken;
      const targetTokenInOwn = target.accessToken;

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${target.userId}/suspend`)
        .set('Authorization', `Bearer ${adminA.accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('SUSPENDED');
      expect(response.body.userId).toBe(target.userId);

      // vínculo do tenant do target permanece ACTIVE (isolamento)
      const ownLink = await prisma.userTenant.findUniqueOrThrow({
        where: {
          userId_tenantId: { userId: target.userId, tenantId: target.tenantId },
        },
      });
      expect(ownLink.status).toBe('ACTIVE');

      // sessão em tenantA revogada; sessão no tenant do target não
      const sessionInA = await prisma.session.findFirstOrThrow({
        where: { userId: target.userId, tenantId: adminA.tenantId },
      });
      const sessionInOwn = await prisma.session.findFirstOrThrow({
        where: { userId: target.userId, tenantId: target.tenantId },
      });
      expect(sessionInA.revokedAt).not.toBeNull();
      expect(sessionInOwn.revokedAt).toBeNull();

      // token de A rejeitado; token do próprio tenant segue funcionando
      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${targetTokenInA}`)
        .expect(401);

      await request(app.getHttpServer())
        .get('/api/animals')
        .set('Authorization', `Bearer ${targetTokenInOwn}`)
        .expect(200);
    });

    it('should revoke the link and restore it back to ACTIVE', async () => {
      const prisma = getPrisma(app);
      const admin = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });
      const target = await registerUser(app, {
        email: 'target@test.com',
        password: 'password123',
      });

      await prisma.userTenant.create({
        data: {
          userId: target.userId,
          tenantId: admin.tenantId,
          status: 'ACTIVE',
          acceptedAt: new Date(),
        },
      });

      await request(app.getHttpServer())
        .patch(`/api/users/${target.userId}/revoke`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(200)
        .then((res) => expect(res.body.status).toBe('REVOKED'));

      await request(app.getHttpServer())
        .patch(`/api/users/${target.userId}/restore`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(200)
        .then((res) => expect(res.body.status).toBe('ACTIVE'));
    });

    it('should not let an admin of another tenant touch the link (404, cross-tenant)', async () => {
      const prisma = getPrisma(app);
      const adminA = await registerUser(app, {
        email: 'admin-a@test.com',
        password: 'password123',
      });
      const adminB = await registerUser(app, {
        email: 'admin-b@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .patch(`/api/users/${adminB.userId}/suspend`)
        .set('Authorization', `Bearer ${adminA.accessToken}`)
        .expect(404);

      const linkB = await prisma.userTenant.findUniqueOrThrow({
        where: {
          userId_tenantId: { userId: adminB.userId, tenantId: adminB.tenantId },
        },
      });
      expect(linkB.status).toBe('ACTIVE');
    });

    it('should return 403 for a user without USER_MANAGE', async () => {
      const admin = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });
      const target = await registerUser(app, {
        email: 'target@test.com',
        password: 'password123',
      });
      const reception = await registerUser(app, {
        email: 'recepcao@test.com',
        password: 'password123',
      });

      await setUserRole(app, reception, 'RECEPTIONIST');

      await request(app.getHttpServer())
        .patch(`/api/users/${target.userId}/suspend`)
        .set('Authorization', `Bearer ${reception.accessToken}`)
        .expect(403);
    });

    it('should return 400 for a non-uuid id', async () => {
      const admin = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .patch('/api/users/not-a-uuid/suspend')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .patch('/api/users/00000000-0000-0000-0000-000000000000/suspend')
        .expect(401);
    });
  });

  describe('PATCH /api/users/:id/deactivate | activate (platform admin)', () => {
    it('should refuse deactivation by a non platform admin', async () => {
      const admin = await registerUser(app, {
        email: 'admin@test.com',
        password: 'password123',
      });
      const target = await registerUser(app, {
        email: 'target@test.com',
        password: 'password123',
      });

      await request(app.getHttpServer())
        .patch(`/api/users/${target.userId}/deactivate`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(403);
    });

    it('should deactivate globally, revoke every session and reactivate', async () => {
      const prisma = getPrisma(app);

      const platform = await registerUser(app, {
        email: 'platform@test.com',
        password: 'password123',
      });
      const target = await registerUser(app, {
        email: 'target@test.com',
        password: 'password123',
      });
      // sessão extra do target em outro tenant
      const otherTenantAdmin = await registerUser(app, {
        email: 'other@test.com',
        password: 'password123',
      });

      await prisma.userTenant.create({
        data: {
          userId: target.userId,
          tenantId: otherTenantAdmin.tenantId,
          status: 'ACTIVE',
          acceptedAt: new Date(),
        },
      });

      await prisma.user.update({
        where: { id: platform.userId },
        data: { isPlatformAdmin: true },
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/users/${target.userId}/deactivate`)
        .set('Authorization', `Bearer ${platform.accessToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(false);

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: target.userId },
      });
      expect(user.isActive).toBe(false);

      // TODAS as sessões do target, em todos os tenants, revogadas
      const sessions = await prisma.session.findMany({
        where: { userId: target.userId },
      });
      expect(sessions.length).toBeGreaterThan(0);
      for (const session of sessions) {
        expect(session.revokedAt).not.toBeNull();
      }

      // token antigo rejeitado
      await request(app.getHttpServer())
        .get('/api/animals')
        .set('Authorization', `Bearer ${target.accessToken}`)
        .expect(401);

      // reativação devolve isActive
      await request(app.getHttpServer())
        .patch(`/api/users/${target.userId}/activate`)
        .set('Authorization', `Bearer ${platform.accessToken}`)
        .expect(200)
        .then((res) => expect(res.body.isActive).toBe(true));

      const reactivated = await prisma.user.findUniqueOrThrow({
        where: { id: target.userId },
      });
      expect(reactivated.isActive).toBe(true);
    });

    it('should return 404 for a nonexistent user', async () => {
      const platform = await registerUser(app, {
        email: 'platform@test.com',
        password: 'password123',
      });
      await getPrisma(app).user.update({
        where: { id: platform.userId },
        data: { isPlatformAdmin: true },
      });

      await request(app.getHttpServer())
        .patch('/api/users/00000000-0000-0000-0000-000000000000/deactivate')
        .set('Authorization', `Bearer ${platform.accessToken}`)
        .expect(404);
    });
  });
});
