import { Body, Controller, Post } from "@nestjs/common";
import { Roles } from "../support/roles.decorator";
import { BackupService } from "./backup.service";

@Controller("backup")
export class BackupController {
  constructor(private readonly backups: BackupService) {}

  @Roles("SUPER_ADMIN", "ADMIN")
  @Post("export")
  export() {
    return this.backups.exportBackup();
  }

  @Roles("SUPER_ADMIN")
  @Post("restore")
  restore(@Body() body: { path: string }) {
    return this.backups.restoreBackup(body.path);
  }
}

