const { mkdirSync } = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

if (!process.env.DATABASE_URL) {
  const dataDir = path.resolve(__dirname, "../../../data/dev");
  mkdirSync(dataDir, { recursive: true });
  process.env.DATABASE_URL = `file:${path.join(dataDir, "hms.sqlite").replace(/\\/g, "/")}`;
}

const prisma = new PrismaClient();

const statements = [
  `PRAGMA foreign_keys = ON`,
  `CREATE TABLE IF NOT EXISTS Role (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL UNIQUE, description TEXT, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS User (id TEXT PRIMARY KEY NOT NULL, username TEXT NOT NULL UNIQUE, fullName TEXT NOT NULL, passwordHash TEXT NOT NULL, roleName TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT true, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS FacilityProfile (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, address TEXT, phone TEXT, logoPath TEXT, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS Patient (id TEXT PRIMARY KEY NOT NULL, patientNumber TEXT NOT NULL UNIQUE, firstName TEXT NOT NULL, middleName TEXT, lastName TEXT NOT NULL, sex TEXT NOT NULL, dateOfBirth DATETIME, ageYears INTEGER, phone TEXT, address TEXT, nextOfKinName TEXT, nextOfKinPhone TEXT, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS Encounter (id TEXT PRIMARY KEY NOT NULL, visitNumber TEXT NOT NULL UNIQUE, patientId TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ARRIVED', openedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, readyForDoctorAt DATETIME, closedAt DATETIME, CONSTRAINT Encounter_patientId_fkey FOREIGN KEY (patientId) REFERENCES Patient(id) ON DELETE RESTRICT ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS TriageRecord (id TEXT PRIMARY KEY NOT NULL, encounterId TEXT NOT NULL UNIQUE, temperature REAL, systolicBp INTEGER, diastolicBp INTEGER, pulse INTEGER, respiratoryRate INTEGER, oxygenSaturation INTEGER, weightKg REAL, painScore INTEGER, chiefComplaint TEXT NOT NULL, suggestedPriority TEXT NOT NULL, priority TEXT NOT NULL, completedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT TriageRecord_encounterId_fkey FOREIGN KEY (encounterId) REFERENCES Encounter(id) ON DELETE RESTRICT ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS Consultation (id TEXT PRIMARY KEY NOT NULL, encounterId TEXT NOT NULL UNIQUE, historyOfPresentingComplaint TEXT, examinationFindings TEXT, diagnosisText TEXT, treatmentPlan TEXT, clinicalNotes TEXT, status TEXT NOT NULL DEFAULT 'IN_PROGRESS', startedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, completedAt DATETIME, CONSTRAINT Consultation_encounterId_fkey FOREIGN KEY (encounterId) REFERENCES Encounter(id) ON DELETE RESTRICT ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS Diagnosis (id TEXT PRIMARY KEY NOT NULL, consultationId TEXT NOT NULL, code TEXT, description TEXT NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT Diagnosis_consultationId_fkey FOREIGN KEY (consultationId) REFERENCES Consultation(id) ON DELETE RESTRICT ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS LabOrder (id TEXT PRIMARY KEY NOT NULL, encounterId TEXT NOT NULL, consultationId TEXT, testName TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', orderedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, completedAt DATETIME, CONSTRAINT LabOrder_encounterId_fkey FOREIGN KEY (encounterId) REFERENCES Encounter(id) ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT LabOrder_consultationId_fkey FOREIGN KEY (consultationId) REFERENCES Consultation(id) ON DELETE SET NULL ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS LabResult (id TEXT PRIMARY KEY NOT NULL, labOrderId TEXT NOT NULL UNIQUE, resultText TEXT NOT NULL, completedBy TEXT, completedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT LabResult_labOrderId_fkey FOREIGN KEY (labOrderId) REFERENCES LabOrder(id) ON DELETE RESTRICT ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS Medication (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, genericName TEXT, form TEXT, strength TEXT, unitPriceCents INTEGER NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT true, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS Prescription (id TEXT PRIMARY KEY NOT NULL, encounterId TEXT NOT NULL, consultationId TEXT, status TEXT NOT NULL DEFAULT 'PENDING', createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, dispensedAt DATETIME, CONSTRAINT Prescription_encounterId_fkey FOREIGN KEY (encounterId) REFERENCES Encounter(id) ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT Prescription_consultationId_fkey FOREIGN KEY (consultationId) REFERENCES Consultation(id) ON DELETE SET NULL ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS PrescriptionItem (id TEXT PRIMARY KEY NOT NULL, prescriptionId TEXT NOT NULL, medicationId TEXT, medicineNameSnapshot TEXT NOT NULL, dosage TEXT NOT NULL, route TEXT, frequency TEXT NOT NULL, duration TEXT NOT NULL, quantity INTEGER NOT NULL, instructions TEXT, dispensedQuantity INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'PENDING', CONSTRAINT PrescriptionItem_prescriptionId_fkey FOREIGN KEY (prescriptionId) REFERENCES Prescription(id) ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT PrescriptionItem_medicationId_fkey FOREIGN KEY (medicationId) REFERENCES Medication(id) ON DELETE SET NULL ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS Invoice (id TEXT PRIMARY KEY NOT NULL, invoiceNo TEXT NOT NULL UNIQUE, encounterId TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'UNPAID', totalCents INTEGER NOT NULL DEFAULT 0, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, paidAt DATETIME, CONSTRAINT Invoice_encounterId_fkey FOREIGN KEY (encounterId) REFERENCES Encounter(id) ON DELETE RESTRICT ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS InvoiceItem (id TEXT PRIMARY KEY NOT NULL, invoiceId TEXT NOT NULL, description TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, unitCents INTEGER NOT NULL, totalCents INTEGER NOT NULL, CONSTRAINT InvoiceItem_invoiceId_fkey FOREIGN KEY (invoiceId) REFERENCES Invoice(id) ON DELETE RESTRICT ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS Payment (id TEXT PRIMARY KEY NOT NULL, invoiceId TEXT NOT NULL, amountCents INTEGER NOT NULL, method TEXT NOT NULL DEFAULT 'CASH', reference TEXT, receivedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT Payment_invoiceId_fkey FOREIGN KEY (invoiceId) REFERENCES Invoice(id) ON DELETE RESTRICT ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS AuditLog (id TEXT PRIMARY KEY NOT NULL, actorId TEXT, action TEXT NOT NULL, entityType TEXT NOT NULL, entityId TEXT, details TEXT, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT AuditLog_actorId_fkey FOREIGN KEY (actorId) REFERENCES User(id) ON DELETE SET NULL ON UPDATE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS User_roleName_idx ON User(roleName)`,
  `CREATE INDEX IF NOT EXISTS Patient_lastName_firstName_idx ON Patient(lastName, firstName)`,
  `CREATE INDEX IF NOT EXISTS Patient_phone_idx ON Patient(phone)`,
  `CREATE INDEX IF NOT EXISTS Encounter_status_openedAt_idx ON Encounter(status, openedAt)`,
  `CREATE INDEX IF NOT EXISTS Encounter_patientId_openedAt_idx ON Encounter(patientId, openedAt)`,
  `CREATE INDEX IF NOT EXISTS LabOrder_status_orderedAt_idx ON LabOrder(status, orderedAt)`,
  `CREATE INDEX IF NOT EXISTS Medication_name_idx ON Medication(name)`,
  `CREATE INDEX IF NOT EXISTS Medication_genericName_idx ON Medication(genericName)`,
  `CREATE INDEX IF NOT EXISTS AuditLog_action_createdAt_idx ON AuditLog(action, createdAt)`,
  `CREATE INDEX IF NOT EXISTS AuditLog_entityType_entityId_idx ON AuditLog(entityType, entityId)`
];

async function main() {
  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("SQLite schema is ready.");
  })
  .catch(async (error) => {
    await prisma.$disconnect();
    console.error(error);
    process.exit(1);
  });
