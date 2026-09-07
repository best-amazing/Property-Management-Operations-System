import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const pipelineService = {
  findAll: () =>
    prisma.pipeline.findMany({
      include: { department: true },
      orderBy: { label: "asc" },
    }),

  findById: (id: string) =>
    prisma.pipeline.findUnique({
      where: { id },
      include: { department: true },
    }),

  create: (data: any) =>
    prisma.pipeline.create({
      data,
      include: { department: true },
    }),

  update: (id: string, data: any) =>
    prisma.pipeline.update({
      where: { id },
      data,
      include: { department: true },
    }),

  delete: (id: string) => prisma.pipeline.delete({ where: { id } }),
};
