import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const departmentService = {
  findAll: () =>
    prisma.department.findMany({
      include: { pipelines: true },
      orderBy: { name: "asc" },
    }),

  findById: (id: string) =>
    prisma.department.findUnique({
      where: { id },
      include: { pipelines: true },
    }),

  create: (data: { name: string }) =>
    prisma.department.create({
      data,
      include: { pipelines: true },
    }),

  update: (id: string, data: { name?: string }) =>
    prisma.department.update({
      where: { id },
      data,
      include: { pipelines: true },
    }),

  delete: (id: string) =>
    prisma.department.delete({ where: { id } }),
};
