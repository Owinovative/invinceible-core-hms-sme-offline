export const ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "RECEPTIONIST",
  "TRIAGE_NURSE",
  "DOCTOR",
  "LAB_TECHNICIAN",
  "PHARMACIST",
  "CASHIER",
] as const;

export type RoleName = (typeof ROLES)[number];

export const TRIAGE_PRIORITIES = ["NORMAL", "URGENT", "EMERGENCY", "CRITICAL"] as const;
export type TriagePriority = (typeof TRIAGE_PRIORITIES)[number];

export const priorityRank: Record<TriagePriority, number> = {
  CRITICAL: 0,
  EMERGENCY: 1,
  URGENT: 2,
  NORMAL: 3,
};

export function suggestTriagePriority(input: {
  temperature?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  pulse?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  painScore?: number | null;
}): TriagePriority {
  const spo2 = input.oxygenSaturation ?? 100;
  const systolic = input.systolicBp ?? 120;
  const temp = input.temperature ?? 36.8;
  const pulse = input.pulse ?? 80;
  const rr = input.respiratoryRate ?? 18;
  const pain = input.painScore ?? 0;

  if (spo2 < 88 || systolic < 80 || pulse > 140 || rr > 35 || pain >= 9) {
    return "CRITICAL";
  }

  if (spo2 < 92 || systolic < 90 || temp >= 40 || pulse > 120 || rr > 28 || pain >= 7) {
    return "EMERGENCY";
  }

  if (spo2 < 95 || temp >= 38.5 || pulse > 105 || rr > 24 || pain >= 5) {
    return "URGENT";
  }

  return "NORMAL";
}

export interface QueuePatient {
  triagePriority: TriagePriority;
  readyAt: string | Date;
}

export function compareDoctorQueue(a: QueuePatient, b: QueuePatient): number {
  const priority = priorityRank[a.triagePriority] - priorityRank[b.triagePriority];
  if (priority !== 0) return priority;
  return new Date(a.readyAt).getTime() - new Date(b.readyAt).getTime();
}

