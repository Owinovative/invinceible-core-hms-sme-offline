import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { HmsService } from "./hms.service";
import { CurrentUser } from "../support/current-user.decorator";
import { Roles } from "../support/roles.decorator";
import type { RequestUser } from "../support/jwt-role.guard";

@Controller("encounters")
export class EncountersController {
  constructor(private readonly hms: HmsService) {}

  @Get("today")
  today() {
    return this.hms.todayArrivals();
  }

  @Roles("SUPER_ADMIN", "ADMIN", "RECEPTIONIST")
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: { patientId: string }) {
    return this.hms.createEncounter(user.id, body.patientId);
  }

  @Get(":id/workspace")
  workspace(@Param("id") id: string) {
    return this.hms.consultationWorkspace(id);
  }
}

