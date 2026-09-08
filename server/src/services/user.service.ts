import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { syncTeamLead } from "./team.service";

const prisma = new PrismaClient();

const USER_SELECT = {
  id: true, username: true, display_name: true, role: true,
  staff_type_id: true, team_id: true, created_at: true,
} as const;

export const userService = {
  findById: (id: string, include?: any) => prisma.user.findUnique({ where: { id }, include }),
  findByUsername: (username: string) => prisma.user.findUnique({ where: { username } }),
  findAll: () => prisma.user.findMany({
    select: { 
      id: true, username: true, display_name: true, role: true, created_at: true,
      staff_type_id: true, team_id: true,
      staff_type: { select: { id: true, name: true, permissions: true, allowed_departments: true, allowed_pipelines: true } },
      team: { select: { id: true, name: true } }
    },
  }),
  create: async (data: any) => {
    if (data.role === "team_lead" && !data.team_id) {
      throw new Error("A Team Lead must be assigned to a Team");
    }
    const password_hash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        username: data.username.toLowerCase(),
        display_name: data.display_name,
        password_hash,
        role: data.role,
        staff_type_id: data.staff_type_id || null,
        team_id: data.team_id || null,
      },
      select: USER_SELECT,
    });
    if (data.role === "team_lead" && data.team_id) {
      await prisma.$transaction((tx) => syncTeamLead(tx, data.team_id, user.id));
    }
    return prisma.user.findUnique({ where: { id: user.id }, select: USER_SELECT });
  },
  update: async (id: string, data: any) => {
    const current = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, team_id: true } });
    if (!current) throw new Error("User not found");

    const nextTeamId = data.team_id === undefined ? current.team_id : data.team_id;
    if (data.role === "team_lead" && !nextTeamId) {
      throw new Error("A Team Lead must be assigned to a Team");
    }

    const updateData: any = { ...data };
    if (data.password) {
      updateData.password_hash = await bcrypt.hash(data.password, 10);
      delete updateData.password;
    }

    await prisma.user.update({ where: { id }, data: updateData });

    if ("role" in data && data.role !== "team_lead") {
      const ledTeam = await prisma.team.findFirst({ where: { lead_id: id }, select: { id: true } });
      if (ledTeam) await prisma.team.update({ where: { id: ledTeam.id }, data: { lead_id: null } });
    }

    if ("role" in data && data.role === "team_lead" && nextTeamId) {
      await prisma.$transaction((tx) => syncTeamLead(tx, nextTeamId, id));
    }

    return prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  },
  delete: async (id: string) => {
    return prisma.$transaction([
      prisma.team.updateMany({ where: { lead_id: id }, data: { lead_id: null } }),
      prisma.pendingLogin.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);
  },
};
