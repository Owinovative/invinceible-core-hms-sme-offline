import { SetMetadata } from "@nestjs/common";
import type { RoleName } from "@invinceible/sme-shared";

export const IS_PUBLIC = "isPublic";
export const ROLES_META = "roles";

export const Public = () => SetMetadata(IS_PUBLIC, true);
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_META, roles);

