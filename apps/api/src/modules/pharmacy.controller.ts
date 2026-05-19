import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { HmsService } from "./hms.service";
import { CurrentUser } from "../support/current-user.decorator";
import { Roles } from "../support/roles.decorator";
import type { RequestUser } from "../support/jwt-role.guard";

@Controller("pharmacy")
export class PharmacyController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hms: HmsService,
  ) {}

  @Get("medications")
  medications() {
    return this.prisma.medication.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  }

  @Roles("SUPER_ADMIN", "ADMIN", "PHARMACIST")
  @Post("medications")
  createMedication(@Body() body: any) {
    return this.prisma.medication.create({ data: body });
  }

  @Get("queue")
  queue() {
    return this.hms.pharmacyQueue();
  }

  @Roles("SUPER_ADMIN", "ADMIN", "PHARMACIST")
  @Post("prescriptions/:id/dispense")
  dispense(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: { quantities: Record<string, number> }) {
    return this.hms.dispense(user.id, id, body.quantities || {});
  }
}

