import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("password123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      email: "admin@test.com",
      passwordHash: adminPassword,
      fullName: "Admin User",
      role: "ADMIN",
    },
  });

  let customer = await prisma.customer.findFirst();
  if (!customer) {
    const user = await prisma.user.create({
      data: {
        email: "john@example.com",
        passwordHash: adminPassword,
        fullName: "John Doe",
        role: "CUSTOMER",
      },
    });

    customer = await prisma.customer.create({
      data: {
        userId: user.id,
        phone: "+1-555-0100",
        addressLine: "123 Main St",
        city: "New York",
        state: "NY",
        postalCode: "10001",
        monthlyIncome: 5000,
        employmentType: "SALARIED",
        employerName: "Acme Corp",
      },
    });

    const user2 = await prisma.user.create({
      data: {
        email: "jane@example.com",
        passwordHash: adminPassword,
        fullName: "Jane Smith",
        role: "CUSTOMER",
      },
    });

    await prisma.customer.create({
      data: {
        userId: user2.id,
        phone: "+1-555-0200",
        city: "Los Angeles",
        state: "CA",
        monthlyIncome: 8000,
        employmentType: "SELF_EMPLOYED",
      },
    });
  }

  console.log("Seed completed successfully");
  console.log("Admin login: admin@test.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
