import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { RoleName } from "@invinceible/sme-shared";
import { PrismaService } from "../prisma.service";
import { jwtSecret } from "../support/jwt-role.guard";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid username or password.");
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, roleName: user.roleName },
      jwtSecret(),
      { expiresIn: "12h" },
    );

    return { token, user: this.safeUser(user) };
  }

  async createInitialSuperAdmin(input: { username: string; fullName: string; password: string }) {
    const users = await this.prisma.user.count();
    if (users > 0) throw new BadRequestException("Initial setup has already been completed.");
    if (input.password.length < 10) throw new BadRequestException("Password must be at least 10 characters.");

    const user = await this.prisma.user.create({
      data: {
        username: input.username.trim(),
        fullName: input.fullName.trim(),
        roleName: "SUPER_ADMIN",
        passwordHash: await bcrypt.hash(input.password, 12),
      },
    });

    return this.safeUser(user);
  }

  safeUser(user: { id: string; username: string; fullName: string; roleName: string; active: boolean }) {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      roleName: user.roleName as RoleName,
      active: user.active,
    };
  }
}

