import { BadRequestException, Body, Controller, Get, Post } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { Public } from "../support/roles.decorator";
import { AuthService } from "./auth.service";

@Controller("setup")
export class SetupController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  @Public()
  @Get("status")
  async status() {
    const [facilityCount, userCount] = await Promise.all([
      this.prisma.facilityProfile.count(),
      this.prisma.user.count(),
    ]);
    return { completed: facilityCount > 0 && userCount > 0 };
  }

  @Public()
  @Post()
  async complete(
    @Body()
    body: {
      facilityName: string;
      address?: string;
      phone?: string;
      adminFullName: string;
      adminUsername: string;
      adminPassword: string;
    },
  ) {
    const existing = await this.status();
    if (existing.completed) return existing;
    if (!body.facilityName?.trim()) throw new BadRequestException("Facility name is required.");
    if (!body.adminFullName?.trim()) throw new BadRequestException("Admin full name is required.");
    if (!body.adminUsername?.trim()) throw new BadRequestException("Admin username is required.");
    if (!body.adminPassword || body.adminPassword.length < 10) {
      throw new BadRequestException("Admin password must be at least 10 characters.");
    }

    await this.prisma.facilityProfile.create({
      data: {
        name: body.facilityName.trim(),
        address: body.address || null,
        phone: body.phone || null,
      },
    });
    const user = await this.auth.createInitialSuperAdmin({
      username: body.adminUsername,
      fullName: body.adminFullName,
      password: body.adminPassword,
    });
    return { completed: true, user };
  }
}
