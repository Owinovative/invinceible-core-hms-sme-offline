import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { ROLES } from "@invinceible/sme-shared";

const prisma = new PrismaClient();

async function main() {
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role },
      update: {},
      create: { name: role, description: role.replaceAll("_", " ").toLowerCase() },
    });
  }

  const medicationCount = await prisma.medication.count();
  if (medicationCount === 0) {
    await prisma.medication.createMany({
      data: [
        { name: "Paracetamol", genericName: "Paracetamol", form: "Tablet", strength: "500mg", unitPriceCents: 500 },
        { name: "Amoxicillin", genericName: "Amoxicillin", form: "Capsule", strength: "500mg", unitPriceCents: 1500 },
        { name: "Cetirizine", genericName: "Cetirizine", form: "Tablet", strength: "10mg", unitPriceCents: 300 },
        { name: "ORS Sachet", genericName: "Oral Rehydration Salts", form: "Sachet", strength: "Standard", unitPriceCents: 1000 },
      ],
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
        passwordHash: await bcrypt.hash("AdminPass123", 12),
      },
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

