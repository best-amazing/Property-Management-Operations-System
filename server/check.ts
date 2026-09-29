import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ where: { username: 'saintsidus@gmail.com' }});
  console.log("Specific User:", users);

  const categories = await prisma.policyCategory.findMany();
  console.log("Categories:", categories);

  const policies = await prisma.policy.findMany();
  console.log("Policies:", policies.map(p => ({ id: p.id, title: p.title, status: p.status, category_id: p.category_id })));

  const announcements = await prisma.announcement.findMany();
  console.log("Announcements:", announcements.map(a => ({ id: a.id, title: a.title, target: a.target_type })));

  const receipts = await prisma.announcementReceipt.findMany();
  console.log("Receipts per user:");
  const userReceipts: any = {};
  receipts.forEach(r => {
    userReceipts[r.user_id] = (userReceipts[r.user_id] || 0) + 1;
  });
  console.log(userReceipts);
}

main().finally(() => prisma.$disconnect());
