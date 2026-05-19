import { Body, Controller, Get, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CurrentUser } from "../support/current-user.decorator";
import { Public } from "../support/roles.decorator";
import type { RequestUser } from "../support/jwt-role.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  login(@Body() body: { username: string; password: string }) {
    return this.auth.login(body.username, body.password);
  }

  @Post("logout")
  logout() {
    return { ok: true };
  }

  @Get("me")
  me(@CurrentUser() user: RequestUser) {
    return { user };
  }
}

