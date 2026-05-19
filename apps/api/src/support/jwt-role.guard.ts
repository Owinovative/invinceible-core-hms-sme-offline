import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import jwt from "jsonwebtoken";
import { IS_PUBLIC, ROLES_META } from "./roles.decorator";
import type { RoleName } from "@invinceible/sme-shared";

export interface RequestUser {
  id: string;
  username: string;
  roleName: RoleName;
}

@Injectable()
export class JwtRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const header = String(request.headers.authorization || "");
    if (!header.startsWith("Bearer ")) throw new UnauthorizedException("Login required.");

    try {
      request.user = jwt.verify(header.slice(7), jwtSecret()) as RequestUser;
    } catch {
      throw new UnauthorizedException("Invalid or expired session.");
    }

    const allowed = this.reflector.getAllAndOverride<RoleName[]>(ROLES_META, [context.getHandler(), context.getClass()]);
    if (allowed?.length && !allowed.includes(request.user.roleName)) {
      throw new ForbiddenException("This role cannot perform this action.");
    }

    return true;
  }
}

export function jwtSecret(): string {
  return process.env.JWT_SECRET || "offline-local-development-secret";
}

