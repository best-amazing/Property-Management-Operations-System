import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const ticketCategoryService = {
  findAll: () => prisma.ticketCategory.findMany(),
  create: (data: any) => prisma.ticketCategory.create({ data }),
  delete: (id: string) => prisma.ticketCategory.delete({ where: { id } }),
};
