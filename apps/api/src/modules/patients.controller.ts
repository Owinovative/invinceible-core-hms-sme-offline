import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { HmsService } from "./hms.service";
import { PrismaService } from "../prisma.service";
import { Roles } from "../support/roles.decorator";
import { CurrentUser } from "../support/current-user.decorator";
import type { RequestUser } from "../support/jwt-role.guard";

@Controller("patients")
export class PatientsController {
  constructor(
    private readonly hms: HmsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  list(@Query("search") search = "") {
    return this.hms.searchPatients(search);
  }

  @Get(":id")
  history(@Param("id") id: string) {
    return this.hms.patientHistory(id);
  }

  @Roles("SUPER_ADMIN", "ADMIN", "RECEPTIONIST")
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: any) {
    return this.hms.createPatient(user.id, body);
  }

  @Roles("SUPER_ADMIN", "ADMIN", "RECEPTIONIST")
  @Put(":id")
  update(@Param("id") id: string, @Body() body: any) {
    return this.prisma.patient.update({ where: { id }, data: body });
  }
}

