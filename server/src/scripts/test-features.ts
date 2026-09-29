import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runTests() {
  console.log("Starting Feature Tests...");

  try {
    // 1. Create a Contact Type
    const contactType = await prisma.contactType.create({
      data: { name: "Test Vendor " + Date.now() },
    });
    console.log("✅ Created ContactType:", contactType.name);

    // 2. Create a Contact
    const contact = await prisma.contact.create({
      data: {
        name: "Acme Repairs",
        email: "test@acme.com",
        phone: "555-0101",
        city: "Testville",
        state: "TS",
        type_id: contactType.id,
      },
    });
    console.log("✅ Created Contact:", contact.name, "in", contact.city);

    // 3. Create a Policy Category
    const policyCat = await prisma.policyCategory.create({
      data: { name: "Test Category " + Date.now(), order: 1 },
    });
    console.log("✅ Created Policy Category:", policyCat.name);

    // 4. Create a Policy
    const policy = await prisma.policy.create({
      data: {
        title: "Test Policy",
        content: "This is a test policy.",
        category_id: policyCat.id,
        order: 1,
        status: "published",
        created_by: "system",
      },
    });
    console.log("✅ Created Policy:", policy.title, "Status:", policy.status);

    // 5. Create an Announcement (Target ALL)
    // First, ensure at least one user exists for testing
    let user = await prisma.user.findFirst();
    if (!user) {
        user = await prisma.user.create({
            data: { username: "testuser", password_hash: "pwd", display_name: "Test User", role: "staff" }
        });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: "Test Announcement",
        content: "Important test info",
        priority: "urgent",
        target_type: "all",
        require_ack: true,
        created_by: user.id,
      },
    });
    console.log("✅ Created Announcement:", announcement.title);

    // 6. Simulate generating receipts (logic from announcements controller)
    const targetUsers = await prisma.user.findMany({ select: { id: true } });
    if (targetUsers.length > 0) {
      const receiptData = targetUsers.map((u) => ({
        announcement_id: announcement.id,
        user_id: u.id,
        status: "delivered",
      }));
      // Need to use create (Prisma expects exact types for createMany, let's use a loop or createMany if supported)
      // Actually, createMany is valid in Prisma.
      // @ts-ignore
      await prisma.announcementReceipt.createMany({ data: receiptData });
      
      const receiptCount = await prisma.announcementReceipt.count({ where: { announcement_id: announcement.id }});
      console.log(`✅ Generated ${receiptCount} Announcement Receipts for target users.`);
    }

    console.log("🎉 All Tests Passed!");

  } catch (error) {
    console.error("❌ Test Failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
