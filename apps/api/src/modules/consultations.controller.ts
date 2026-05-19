import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { HmsService } from "./hms.service";
import { CurrentUser } from "../support/current-user.decorator";
import { Roles } from "../support/roles.decorator";
import type { RequestUser } from "../support/jwt-role.guard";

@Controller("consultations")
export class ConsultationsController {
  constructor(private readonly hms: HmsService) {}

  @Get("doctor-queue")
  doctorQueue(@Query("status") status?: string, @Query("priority") priority?: string) {
    return this.hms.doctorQueue({ status, priority });
  }

  @Get(":encounterId")
  workspace(@Param("encounterId") encounterId: string) {
    return this.hms.consultationWorkspace(encounterId);
  }

  @Roles("SUPER_ADMIN", "ADMIN", "DOCTOR")
  @Post(":encounterId")
  save(@CurrentUser() user: RequestUser, @Param("encounterId") encounterId: string, @Body() body: any) {
    return this.hms.saveConsultation(user.id, encounterId, body);
  }

  @Roles("SUPER_ADMIN", "ADMIN", "DOCTOR")
  @Post(":encounterId/labs")
  orderLab(@CurrentUser() user: RequestUser, @Param("encounterId") encounterId: string, @Body() body: { testName: string }) {
    return this.hms.orderLab(user.id, encounterId, body.testName);
  }

  @Roles("SUPER_ADMIN", "ADMIN", "DOCTOR")
  @Post(":encounterId/prescriptions")
  prescribe(@CurrentUser() user: RequestUser, @Param("encounterId") encounterId: string, @Body() body: { items: any[] }) {
    return this.hms.prescribe(user.id, encounterId, body.items || []);
  }
}

