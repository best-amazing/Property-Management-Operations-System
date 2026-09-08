
import prisma from "../utils/prisma";

const TEAM_INCLUDE = {
  lead: { select: { id: true, username: true, display_name: true } },
  members: { select: { id: true, username: true, display_name: true, role: true } },
} as const;

export const syncTeamLead = async (
  tx: any,
  teamId: string,
  leadId: string | null
): Promise<void> => {
  const team = await tx.team.findUnique({ where: { id: teamId }, select: { id: true, lead_id: true } });
  if (!team) throw new Error("Team not found");

  const oldLeadId = team.lead_id;
  if (leadId === oldLeadId) return;

  if (leadId) {
    const other = await tx.team.findFirst({ where: { lead_id: leadId, id: { not: teamId } }, select: { id: true } });
    if (other) await tx.team.update({ where: { id: other.id }, data: { lead_id: null } });
  }

  if (oldLeadId) {
    await tx.user.update({ where: { id: oldLeadId }, data: { role: "staff" } });
  }

  await tx.team.update({ where: { id: teamId }, data: { lead_id: leadId ?? null } });

  if (leadId) {
    await tx.user.update({ where: { id: leadId }, data: { role: "team_lead", team_id: teamId } });
  }
};

export const teamService = {
  findAll: () => prisma.team.findMany({ include: TEAM_INCLUDE }),

  findById: (id: string) => prisma.team.findUnique({ where: { id }, include: TEAM_INCLUDE }),

  create: async (data: any) => {
    const created = await prisma.team.create({ data: { name: data.name } });
    if (data.lead_id) {
      await prisma.$transaction((tx) => syncTeamLead(tx, created.id, data.lead_id));
    }
    return prisma.team.findUnique({ where: { id: created.id }, include: TEAM_INCLUDE });
  },

  update: async (id: string, data: any) => {
    const { member_ids, ...rest } = data;
    const hasMemberIds = Array.isArray(member_ids);
    const hasLeadChange = "lead_id" in data;

    if (!hasMemberIds && !hasLeadChange) {
      const updated = await prisma.team.update({ where: { id }, data: rest });
      return prisma.team.findUnique({ where: { id: updated.id }, include: TEAM_INCLUDE });
    }

    return prisma.$transaction(async (tx) => {
      const team = await tx.team.findUnique({ where: { id }, select: { id: true, lead_id: true } });
      if (!team) throw new Error("Team not found");

      if (rest.name) await tx.team.update({ where: { id }, data: { name: rest.name } });

      if (hasLeadChange) {
        await syncTeamLead(tx, id, data.lead_id ?? null);
      }

      if (hasMemberIds) {
        const newLeadId = hasLeadChange ? (data.lead_id ?? null) : team.lead_id;

        await tx.user.updateMany({ where: { team_id: id }, data: { team_id: null } });

        let ids = member_ids.filter((x: any) => typeof x === "string");
        if (newLeadId && !ids.includes(newLeadId)) ids.push(newLeadId);

        if (ids.length > 0) {
          await tx.user.updateMany({ where: { id: { in: ids } }, data: { team_id: id } });
        }
      }

      return tx.team.findUnique({ where: { id }, include: TEAM_INCLUDE });
    });
  },

  delete: async (id: string) => {
    return prisma.$transaction(async (tx) => {
      const team = await tx.team.findUnique({ where: { id }, select: { id: true, lead_id: true } });
      if (!team) throw new Error("Team not found");

      if (team.lead_id) {
        await tx.user.update({ where: { id: team.lead_id }, data: { role: "staff" } });
      }

      await tx.user.updateMany({ where: { team_id: id }, data: { team_id: null } });

      return tx.team.delete({ where: { id } });
    });
  },
};