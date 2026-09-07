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

  create: (data: any) => {
    const { department_id, ...rest } = data;
    return prisma.pipeline.create({
      data: {
        ...rest,
        department: { connect: { id: department_id } }
      },
      include: { department: true },
    });
  },

  update: (id: string, data: any) => {
    const { department_id, ...rest } = data;
    const updateData: any = { ...rest };
    if (department_id) {
      updateData.department = { connect: { id: department_id } };
    }
    return prisma.pipeline.update({
      where: { id },
      data: updateData,
      include: { department: true },
    });
  },

  delete: (id: string) => prisma.pipeline.delete({ where: { id } }),
};
