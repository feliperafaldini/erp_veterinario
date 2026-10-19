import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';

// Regras definidas em docs/business-rules.md (decisões de 2026-10-19):
// - Suspensão/revogação de UserTenant: ADMIN do próprio tenant com a
//   permissão USER_MANAGE. Afeta somente o tenant da sessão: o vínculo
//   muda de status (a linha é preservada) e as sessões daquele tenant
//   são revogadas.
// - Desativação/ativação de User: somente Platform Admin. Efeito global:
//   isActive no User e revogação de TODAS as sessões do usuário.
const LINK_SELECT = {
  id: true,
  status: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      isPlatformAdmin: true,
    },
  },
  userTenantRoles: {
    select: { role: { select: { name: true } } },
  },
} as const;

type LinkStatus = 'SUSPENDED' | 'REVOKED' | 'ACTIVE';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const links = await this.prisma.userTenant.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      select: LINK_SELECT,
    });

    return links.map((link) => ({
      userId: link.user.id,
      name: link.user.name,
      email: link.user.email,
      isActive: link.user.isActive,
      status: link.status,
      roles: link.userTenantRoles.map((utr) => utr.role.name),
    }));
  }

  async setLinkStatus(tenantId: string, userId: string, status: LinkStatus) {
    return this.prisma.$transaction(async (tx) => {
      const link = await tx.userTenant.findUnique({
        where: { userId_tenantId: { userId, tenantId } },
        select: LINK_SELECT,
      });

      if (!link) {
        throw new NotFoundException(`User not found in this clinic`);
      }

      const updated = await tx.userTenant.update({
        where: { userId_tenantId: { userId, tenantId } },
        data: { status },
        select: LINK_SELECT,
      });

      if (status !== 'ACTIVE') {
        // Regra: suspender/revogar o vínculo revoga as sessões daquele
        // tenant (docs/architecture.md, "Revogação de Sessões").
        await tx.session.updateMany({
          where: { userId, tenantId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      return this.presentLink(updated);
    });
  }

  async deactivate(targetUserId: string, callerUserId: string) {
    await this.requirePlatformAdmin(callerUserId);
    const user = await this.findUserOrThrow(targetUserId);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { isActive: false },
      }),
      // Regra: desativação de User revoga TODAS as sessões do usuário,
      // em todos os tenants.
      this.prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { id: user.id, isActive: false };
  }

  async activate(targetUserId: string, callerUserId: string) {
    await this.requirePlatformAdmin(callerUserId);
    const user = await this.findUserOrThrow(targetUserId);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isActive: true },
    });

    return { id: user.id, isActive: true };
  }

  private async requirePlatformAdmin(callerUserId: string) {
    const caller = await this.prisma.user.findUnique({
      where: { id: callerUserId },
      select: { isPlatformAdmin: true },
    });

    if (!caller?.isPlatformAdmin) {
      throw new ForbiddenException('Platform admin required');
    }
  }

  private async findUserOrThrow(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    return user;
  }

  private presentLink(link: {
    user: { id: string; name: string; email: string; isActive: boolean };
    status: string;
    userTenantRoles: { role: { name: string } }[];
  }) {
    return {
      userId: link.user.id,
      name: link.user.name,
      email: link.user.email,
      isActive: link.user.isActive,
      status: link.status,
      roles: link.userTenantRoles.map((utr) => utr.role.name),
    };
  }
}
