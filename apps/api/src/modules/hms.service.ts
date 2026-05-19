import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { compareDoctorQueue, suggestTriagePriority } from "@invinceible/sme-shared";
import { PrismaService } from "../prisma.service";
import { AuditService } from "../support/audit.service";

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}

@Injectable()
export class HmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createPatient(actorId: string, input: Partial<Prisma.PatientCreateInput> & Record<string, unknown>) {
    const rawAge = input.ageYears as unknown;
    const age = rawAge === "" || rawAge === undefined || rawAge === null ? null : Number(rawAge);
    const patient = await this.prisma.patient.create({
      data: {
        firstName: String(input.firstName || "").trim(),
        middleName: input.middleName ? String(input.middleName).trim() : null,
        lastName: String(input.lastName || "").trim(),
        sex: String(input.sex || "OTHER"),
        dateOfBirth: input.dateOfBirth ? new Date(String(input.dateOfBirth)) : null,
        ageYears: Number.isFinite(age) ? age : null,
        phone: input.phone ? String(input.phone).trim() : null,
        address: input.address ? String(input.address).trim() : null,
        nextOfKinName: input.nextOfKinName ? String(input.nextOfKinName).trim() : null,
        nextOfKinPhone: input.nextOfKinPhone ? String(input.nextOfKinPhone).trim() : null,
        patientNumber: await this.nextCode("PAT", "patient"),
      },
    });
    await this.audit.record(actorId, "patient.registered", "Patient", patient.id, { patientNumber: patient.patientNumber });
    return patient;
  }

  async searchPatients(search = "") {
    const q = search.trim();
    return this.prisma.patient.findMany({
      where: q
        ? {
            OR: [
              { patientNumber: { contains: q } },
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { phone: { contains: q } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async patientHistory(patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        encounters: {
          orderBy: { openedAt: "desc" },
          include: {
            triage: true,
            consultation: { include: { diagnoses: true } },
            labOrders: { include: { result: true } },
            prescriptions: { include: { items: true } },
            invoices: { include: { items: true, payments: true } },
          },
        },
      },
    });
    if (!patient) throw new NotFoundException("Patient not found.");
    return patient;
  }

  async createEncounter(actorId: string, patientId: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException("Patient not found.");
    const encounter = await this.prisma.encounter.create({
      data: {
        patientId,
        visitNumber: await this.nextCode("VIS", "encounter"),
        status: "ARRIVED",
      },
      include: { patient: true },
    });
    await this.audit.record(actorId, "visit.created", "Encounter", encounter.id, { visitNumber: encounter.visitNumber });
    return encounter;
  }

  async todayArrivals() {
    return this.prisma.encounter.findMany({
      where: { openedAt: todayRange() },
      include: { patient: true, triage: true },
      orderBy: { openedAt: "desc" },
    });
  }

  async completeTriage(actorId: string, encounterId: string, input: {
    temperature?: number;
    systolicBp?: number;
    diastolicBp?: number;
    pulse?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    weightKg?: number;
    painScore?: number;
    chiefComplaint: string;
    priority?: string;
  }) {
    const encounter = await this.prisma.encounter.findUnique({ where: { id: encounterId } });
    if (!encounter) throw new NotFoundException("Encounter not found.");
    const suggested = suggestTriagePriority(input);
    const priority = input.priority || suggested;
    const result = await this.prisma.$transaction(async (tx) => {
      const triage = await tx.triageRecord.upsert({
        where: { encounterId },
        update: { ...input, suggestedPriority: suggested, priority },
        create: { ...input, encounterId, suggestedPriority: suggested, priority },
      });
      const updatedEncounter = await tx.encounter.update({
        where: { id: encounterId },
        data: { status: "READY_FOR_DOCTOR", readyForDoctorAt: new Date() },
        include: { patient: true, triage: true },
      });
      return { triage, encounter: updatedEncounter };
    });
    await this.audit.record(actorId, "triage.completed", "Encounter", encounterId, { priority, suggested });
    return result;
  }

  async doctorQueue(filters: { status?: string; priority?: string }) {
    const rows = await this.prisma.encounter.findMany({
      where: {
        status: filters.status || "READY_FOR_DOCTOR",
        triage: filters.priority ? { priority: filters.priority } : undefined,
      },
      include: { patient: true, triage: true },
    });
    return rows.sort((a, b) =>
      compareDoctorQueue({
        triagePriority: (a.triage?.priority || "NORMAL") as never,
        readyAt: a.readyForDoctorAt || a.openedAt,
      }, {
        triagePriority: (b.triage?.priority || "NORMAL") as never,
        readyAt: b.readyForDoctorAt || b.openedAt,
      }),
    );
  }

  async consultationWorkspace(encounterId: string) {
    const encounter = await this.prisma.encounter.findUnique({
      where: { id: encounterId },
      include: { patient: true, triage: true, consultation: { include: { diagnoses: true } }, labOrders: { include: { result: true } }, prescriptions: { include: { items: true } } },
    });
    if (!encounter) throw new NotFoundException("Encounter not found.");
    const previous = await this.prisma.encounter.findMany({
      where: { patientId: encounter.patientId, NOT: { id: encounterId } },
      orderBy: { openedAt: "desc" },
      take: 5,
      include: { consultation: true, labOrders: { include: { result: true } }, prescriptions: { include: { items: true } } },
    });
    return { encounter, previous };
  }

  async saveConsultation(actorId: string, encounterId: string, input: {
    historyOfPresentingComplaint?: string;
    examinationFindings?: string;
    diagnosisText?: string;
    treatmentPlan?: string;
    clinicalNotes?: string;
    completed?: boolean;
  }) {
    const consultation = await this.prisma.consultation.upsert({
      where: { encounterId },
      update: { ...input, status: input.completed ? "COMPLETED" : "IN_PROGRESS", completedAt: input.completed ? new Date() : null },
      create: { encounterId, ...input, status: input.completed ? "COMPLETED" : "IN_PROGRESS", completedAt: input.completed ? new Date() : null },
    });
    if (input.completed) {
      await this.prisma.encounter.update({ where: { id: encounterId }, data: { status: "CONSULTATION_COMPLETED", closedAt: new Date() } });
      await this.audit.record(actorId, "consultation.completed", "Consultation", consultation.id);
    }
    return consultation;
  }

  async orderLab(actorId: string, encounterId: string, testName: string) {
    const consultation = await this.prisma.consultation.findUnique({ where: { encounterId } });
    const order = await this.prisma.labOrder.create({ data: { encounterId, consultationId: consultation?.id, testName } });
    return order;
  }

  async pendingLabs() {
    return this.prisma.labOrder.findMany({ where: { status: "PENDING" }, include: { encounter: { include: { patient: true } } }, orderBy: { orderedAt: "asc" } });
  }

  async completeLab(actorId: string, labOrderId: string, resultText: string) {
    const order = await this.prisma.labOrder.findUnique({ where: { id: labOrderId } });
    if (!order) throw new NotFoundException("Lab order not found.");
    const result = await this.prisma.$transaction(async (tx) => {
      const result = await tx.labResult.upsert({
        where: { labOrderId },
        update: { resultText, completedBy: actorId, completedAt: new Date() },
        create: { labOrderId, resultText, completedBy: actorId },
      });
      await tx.labOrder.update({ where: { id: labOrderId }, data: { status: "COMPLETED", completedAt: new Date() } });
      return result;
    });
    await this.audit.record(actorId, "lab.result.completed", "LabOrder", labOrderId);
    return result;
  }

  async prescribe(actorId: string, encounterId: string, items: Array<{ medicationId?: string; medicineName: string; dosage: string; route?: string; frequency: string; duration: string; quantity: number; instructions?: string }>) {
    if (!items.length) throw new BadRequestException("At least one medicine is required.");
    const consultation = await this.prisma.consultation.findUnique({ where: { encounterId } });
    const prescription = await this.prisma.prescription.create({
      data: {
        encounterId,
        consultationId: consultation?.id,
        items: {
          create: items.map((item) => ({
            medicationId: item.medicationId || null,
            medicineNameSnapshot: item.medicineName,
            dosage: item.dosage,
            route: item.route || null,
            frequency: item.frequency,
            duration: item.duration,
            quantity: Number(item.quantity),
            instructions: item.instructions || null,
          })),
        },
      },
      include: { items: true },
    });
    return prescription;
  }

  async pharmacyQueue() {
    return this.prisma.prescription.findMany({
      where: { status: { in: ["PENDING", "PARTIALLY_DISPENSED"] } },
      include: { encounter: { include: { patient: true } }, items: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async dispense(actorId: string, prescriptionId: string, quantities: Record<string, number>) {
    const prescription = await this.prisma.prescription.findUnique({ where: { id: prescriptionId }, include: { items: true } });
    if (!prescription) throw new NotFoundException("Prescription not found.");
    const result = await this.prisma.$transaction(async (tx) => {
      let allDone = true;
      for (const item of prescription.items) {
        const qty = Math.max(0, Number(quantities[item.id] ?? item.quantity));
        const status = qty >= item.quantity ? "DISPENSED" : qty > 0 ? "PARTIALLY_DISPENSED" : "PENDING";
        if (status !== "DISPENSED") allDone = false;
        await tx.prescriptionItem.update({ where: { id: item.id }, data: { dispensedQuantity: qty, status } });
      }
      return tx.prescription.update({ where: { id: prescriptionId }, data: { status: allDone ? "DISPENSED" : "PARTIALLY_DISPENSED", dispensedAt: new Date() }, include: { items: true } });
    });
    await this.audit.record(actorId, "prescription.dispensed", "Prescription", prescriptionId);
    return result;
  }

  async createInvoice(encounterId: string, items: Array<{ description: string; quantity: number; unitCents: number }>) {
    if (!items.length) throw new BadRequestException("Invoice requires at least one item.");
    const total = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitCents), 0);
    return this.prisma.invoice.create({
      data: {
        encounterId,
        invoiceNo: await this.nextCode("INV", "invoice"),
        totalCents: total,
        items: { create: items.map((item) => ({ ...item, totalCents: Number(item.quantity) * Number(item.unitCents) })) },
      },
      include: { items: true, payments: true, encounter: { include: { patient: true } } },
    });
  }

  async recordPayment(actorId: string, invoiceId: string, amountCents: number, method = "CASH", reference?: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId }, include: { payments: true } });
    if (!invoice) throw new NotFoundException("Invoice not found.");
    const paid = invoice.payments.reduce((sum, payment) => sum + payment.amountCents, 0) + Number(amountCents);
    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({ data: { invoiceId, amountCents: Number(amountCents), method, reference } });
      await tx.invoice.update({ where: { id: invoiceId }, data: { status: paid >= invoice.totalCents ? "PAID" : "PARTIALLY_PAID", paidAt: paid >= invoice.totalCents ? new Date() : null } });
      return payment;
    });
    await this.audit.record(actorId, "payment.recorded", "Invoice", invoiceId, { amountCents, method });
    return result;
  }

  async reports() {
    const range = todayRange();
    const [visitsToday, totalPatients, consultationsCompleted, pendingLabOrders, dispensedPrescriptions, payments] = await Promise.all([
      this.prisma.encounter.count({ where: { openedAt: range } }),
      this.prisma.patient.count(),
      this.prisma.consultation.count({ where: { completedAt: range } }),
      this.prisma.labOrder.count({ where: { status: "PENDING" } }),
      this.prisma.prescription.count({ where: { status: "DISPENSED", dispensedAt: range } }),
      this.prisma.payment.findMany({ where: { receivedAt: range } }),
    ]);
    return {
      visitsToday,
      totalPatients,
      consultationsCompletedToday: consultationsCompleted,
      pendingLabOrders,
      dispensedPrescriptionsToday: dispensedPrescriptions,
      paymentsReceivedTodayCents: payments.reduce((sum, payment) => sum + payment.amountCents, 0),
    };
  }

  private async nextCode(prefix: string, model: "patient" | "encounter" | "invoice") {
    const count = model === "patient"
      ? await this.prisma.patient.count()
      : model === "encounter"
        ? await this.prisma.encounter.count()
        : await this.prisma.invoice.count();
    return `${prefix}-${String(count + 1).padStart(6, "0")}`;
  }
}
