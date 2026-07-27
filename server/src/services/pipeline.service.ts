import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const pipelineService = {
  findAll: () => prisma.pipeline.findMany(),
  findById: (id: string) => prisma.pipeline.findUnique({ where: { id } }),
  create: (data: any) => prisma.pipeline.create({ data }),
  update: (id: string, data: any) => prisma.pipeline.update({ where: { id }, data }),
  delete: (id: string) => prisma.pipeline.delete({ where: { id } }),
};
