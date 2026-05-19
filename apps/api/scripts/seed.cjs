const { mkdirSync } = require("node:fs");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

if (!process.env.DATABASE_URL) {
  const dataDir = path.resolve(__dirname, "../../../data/dev");
  mkdirSync(dataDir, { recursive: true });
  process.env.DATABASE_URL = `file:${path.join(dataDir, "hms.sqlite").replace(/\\/g, "/")}`;
}

const prisma = new PrismaClient();
const roles = [
  "SUPER_ADMIN",
  "ADMIN",
  "RECEPTIONIST",
  "TRIAGE_NURSE",
  "DOCTOR",
  "LAB_TECHNICIAN",
  "PHARMACIST",
  "CASHIER"
];

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role },
      update: {},
      create: { name: role, description: role.replaceAll("_", " ").toLowerCase() }
    });
  }

  if ((await prisma.medication.count()) === 0) {
    await prisma.medication.createMany({
      data: [
        { name: "Paracetamol", genericName: "Paracetamol", form: "Tablet", strength: "500mg", unitPriceCents: 500 },
        { name: "Amoxicillin", genericName: "Amoxicillin", form: "Capsule", strength: "500mg", unitPriceCents: 1500 },
        { name: "Cetirizine", genericName: "Cetirizine", form: "Tablet", strength: "10mg", unitPriceCents: 300 },
        { name: "ORS Sachet", genericName: "Oral Rehydration Salts", form: "Sachet", strength: "Standard", unitPriceCents: 1000 }
      ]
    });
  }

  if (process.env.SEED_DEV_ADMIN === "true") {
    await prisma.user.upsert({
      where: { username: "admin" },
      update: {},
      create: {
        username: "admin",
        fullName: "Offline Super Admin",
        roleName: "SUPER_ADMIN",
        passwordHash: await bcrypt.hash("AdminPass123", 12)
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed completed.");
  })
  .catch(async (error) => {
    await prisma.$disconnect();
    console.error(error);
    process.exit(1);
  });
