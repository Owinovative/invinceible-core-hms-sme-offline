import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { HmsService } from "./hms.service";
import { PrismaService } from "../prisma.service";
import { CurrentUser } from "../support/current-user.decorator";
import { Roles } from "../support/roles.decorator";
import type { RequestUser } from "../support/jwt-role.guard";

@Controller("triage")
export class TriageController {
  constructor(
    private readonly hms: HmsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("queue")
  queue() {
    return this.prisma.encounter.findMany({
      where: { status: "ARRIVED" },
      include: { patient: true },
      orderBy: { openedAt: "asc" },
    });
  }

  @Roles("SUPER_ADMIN", "ADMIN", "TRIAGE_NURSE")
  @Post(":encounterId")
  complete(@CurrentUser() user: RequestUser, @Param("encounterId") encounterId: string, @Body() body: any) {
    return this.hms.completeTriage(user.id, encounterId, body);
  }
}

