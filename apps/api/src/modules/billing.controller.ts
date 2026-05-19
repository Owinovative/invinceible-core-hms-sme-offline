import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { HmsService } from "./hms.service";
import { CurrentUser } from "../support/current-user.decorator";
import { Roles } from "../support/roles.decorator";
import type { RequestUser } from "../support/jwt-role.guard";

@Controller("billing")
export class BillingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hms: HmsService,
  ) {}

  @Get("invoices")
  invoices() {
    return this.prisma.invoice.findMany({ include: { encounter: { include: { patient: true } }, items: true, payments: true }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Get("invoices/:id")
  invoice(@Param("id") id: string) {
    return this.prisma.invoice.findUnique({ where: { id }, include: { encounter: { include: { patient: true } }, items: true, payments: true } });
  }

  @Roles("SUPER_ADMIN", "ADMIN", "CASHIER")
  @Post("invoices")
  create(@Body() body: { encounterId: string; items: any[] }) {
    return this.hms.createInvoice(body.encounterId, body.items || []);
  }

  @Roles("SUPER_ADMIN", "ADMIN", "CASHIER")
  @Post("invoices/:id/payments")
  pay(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() body: { amountCents: number; method?: string; reference?: string }) {
    return this.hms.recordPayment(user.id, id, body.amountCents, body.method, body.reference);
  }
}

