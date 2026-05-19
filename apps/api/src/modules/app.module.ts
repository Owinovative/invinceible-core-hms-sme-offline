import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { PrismaService } from "../prisma.service";
import { AuditService } from "../support/audit.service";
import { JwtRoleGuard } from "../support/jwt-role.guard";
import { SetupController } from "./setup.controller";
import { AuthController } from "./auth.controller";
import { FacilityController } from "./facility.controller";
import { PatientsController } from "./patients.controller";
import { EncountersController } from "./encounters.controller";
import { TriageController } from "./triage.controller";
import { ConsultationsController } from "./consultations.controller";
import { LabController } from "./lab.controller";
import { PharmacyController } from "./pharmacy.controller";
import { BillingController } from "./billing.controller";
import { ReportsController } from "./reports.controller";
import { BackupController } from "./backup.controller";
import { AuthService } from "./auth.service";
import { HmsService } from "./hms.service";
import { BackupService } from "./backup.service";

@Module({
  controllers: [
    SetupController,
    AuthController,
    FacilityController,
    PatientsController,
    EncountersController,
    TriageController,
    ConsultationsController,
    LabController,
    PharmacyController,
    BillingController,
    ReportsController,
    BackupController,
  ],
  providers: [
    PrismaService,
    AuditService,
    AuthService,
    HmsService,
    BackupService,
    { provide: APP_GUARD, useClass: JwtRoleGuard },
  ],
})
export class AppModule {}

