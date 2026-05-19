import { Body, Controller, Get, Put } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { Roles } from "../support/roles.decorator";

@Controller("facility")
export class FacilityController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get() {
    return { facility: await this.prisma.facilityProfile.findFirst() };
  }

  @Roles("SUPER_ADMIN", "ADMIN")
  @Put()
  async update(@Body() body: { name: string; address?: string; phone?: string; logoPath?: string }) {
    const current = await this.prisma.facilityProfile.findFirst();
    const data = {
      name: body.name,
      address: body.address || null,
      phone: body.phone || null,
      logoPath: body.logoPath || null,
    };
    const facility = current
      ? await this.prisma.facilityProfile.update({ where: { id: current.id }, data })
      : await this.prisma.facilityProfile.create({ data });
    return { facility };
  }
}

