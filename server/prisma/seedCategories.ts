import { PrismaClient } from "@prisma/client";
import { PIPELINE_CATEGORY_FIELDS } from "./seedData";

const prisma = new PrismaClient();

async function main() {
  console.log("🏷️  Seeding pipeline categories...");

  for (const [id, categoryField] of Object.entries(PIPELINE_CATEGORY_FIELDS)) {
    const existing = await prisma.pipeline.findUnique({ where: { id } });
    if (!existing) {
      console.log(`  - Pipeline "${id}" not found, skipping`);
      continue;
    }
    const updated = await prisma.pipeline.update({
      where: { id },
      data: { category_field: categoryField },
      select: { id: true, label: true, category_field: true },
    });
    console.log(`  ✓ ${updated.label}: ${(updated.category_field?.options ?? []).join(", ")}`);
  }

  console.log("\n✅ Categories seeded!\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });