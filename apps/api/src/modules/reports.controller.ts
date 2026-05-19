import { Controller, Get } from "@nestjs/common";
import { HmsService } from "./hms.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly hms: HmsService) {}

  @Get("dashboard")
  dashboard() {
    return this.hms.reports();
  }
}

