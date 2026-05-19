import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { RequestUser } from "./jwt-role.guard";

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): RequestUser => {
  return context.switchToHttp().getRequest().user;
});

