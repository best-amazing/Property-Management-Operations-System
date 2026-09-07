import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEAM_INCLUDE = {
  lead: { select: { id: true, username: true, display_name: true } },
  members: { select: { id: true, username: true, display_name: true, role: true } },
} as const;

export const teamService = {
  findAll: () => prisma.team.findMany({ include: TEAM_INCLUDE }),

  findById: (id: string) => prisma.team.findUnique({ where: { id }, include: TEAM_INCLUDE }),

  create: async (data: any) => {
    const created = await prisma.team.create({ data });
    if (data.lead_id) {
      await prisma.user.update({ where: { id: data.lead_id }, data: { team_id: created.id } });
    }
    return prisma.team.findUnique({ where: { id: created.id }, include: TEAM_INCLUDE });
  },

  update: async (id: string, data: any) => {
    const { member_ids, ...rest } = data;

    if (member_ids) {
      return prisma.$transaction(async (tx) => {
        const team = await tx.team.findUnique({ where: { id }, select: { lead_id: true } });

        await tx.user.updateMany({ where: { team_id: id }, data: { team_id: null } });

        let ids = Array.isArray(member_ids) ? member_ids.filter((x: any) => typeof x === "string") : [];
        if (team?.lead_id && !ids.includes(team.lead_id)) ids.push(team.lead_id);

        if (ids.length > 0) {
          await tx.user.updateMany({ where: { id: { in: ids } }, data: { team_id: id } });
        }

        return tx.team.findUnique({ where: { id }, include: TEAM_INCLUDE });
      });
    }

    const updated = await prisma.team.update({ where: { id }, data: rest });
    if (rest.lead_id) {
      await prisma.user.update({ where: { id: rest.lead_id }, data: { team_id: id } });
    }
    return prisma.team.findUnique({ where: { id: updated.id }, include: TEAM_INCLUDE });
  },

  delete: (id: string) => prisma.team.delete({ where: { id } }),
};