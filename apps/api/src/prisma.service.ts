import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ROLES } from "@invinceible/sme-shared";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    await this.ensureSeedData();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async ensureSeedData() {
    for (const role of ROLES) {
      await this.role.upsert({
        where: { name: role },
        update: {},
        create: { name: role, description: role.replaceAll("_", " ").toLowerCase() },
      });
    }
  }
}

