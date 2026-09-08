
import prisma from "../utils/prisma";

const PIPELINE_FIELDS = [
  "label", "code", "stages", "tag_field", "category_field",
  "default_checklist", "department_id", "ticket_fields",
] as const;

const pickPipelineData = (data: any) => {
  const out: any = {};
  for (const key of PIPELINE_FIELDS) {
    if (data[key] !== undefined) out[key] = data[key];
  }
  return out;
};

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
    const { department_id, ...rest } = pickPipelineData(data);
    return prisma.pipeline.create({
      data: {
        ...rest,
        department: { connect: { id: department_id } }
      },
      include: { department: true },
    });
  },

  update: (id: string, data: any) => {
    const { department_id, ...rest } = pickPipelineData(data);
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
