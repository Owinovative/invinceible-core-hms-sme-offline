import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(actorId: string | null, action: string, entityType: string, entityId?: string, details?: unknown) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        details: details ? JSON.stringify(details) : null,
      },
    });
  }
}

