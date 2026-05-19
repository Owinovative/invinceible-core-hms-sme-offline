import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { HmsService } from "./hms.service";
import { CurrentUser } from "../support/current-user.decorator";
import { Roles } from "../support/roles.decorator";
import type { RequestUser } from "../support/jwt-role.guard";

@Controller("lab")
export class LabController {
  constructor(private readonly hms: HmsService) {}

  @Get("orders")
  pending() {
    return this.hms.pendingLabs();
  }

  @Roles("SUPER_ADMIN", "ADMIN", "LAB_TECHNICIAN")
  @Post("orders/:id/result")
  complete(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: { resultText: string }) {
    return this.hms.completeLab(user.id, id, body.resultText);
  }
}

