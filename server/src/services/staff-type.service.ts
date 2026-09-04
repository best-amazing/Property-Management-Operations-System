import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const staffTypeService = {
  findAll: () => prisma.staffType.findMany({
    include: { _count: { select: { users: true } } }
  }),
  findById: (id: string) => prisma.staffType.findUnique({ where: { id } }),
  create: (data: any) => prisma.staffType.create({ data }),
  update: (id: string, data: any) => prisma.staffType.update({ where: { id }, data }),
  delete: (id: string) => prisma.staffType.delete({ where: { id } }),
};
