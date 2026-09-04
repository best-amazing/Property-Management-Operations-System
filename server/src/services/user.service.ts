import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const userService = {
  findByUsername: (username: string) => prisma.user.findUnique({ where: { username } }),
  findAll: () => prisma.user.findMany({
    select: { 
      id: true, username: true, display_name: true, role: true, created_at: true,
      staff_type_id: true, team_id: true,
      staff_type: { select: { id: true, name: true, permissions: true, allowed_categories: true } },
      team: { select: { id: true, name: true } }
    },
  }),
  create: async (data: any) => {
    const password_hash = await bcrypt.hash(data.password, 10);
    return prisma.user.create({
      data: {
        username: data.username.toLowerCase(),
        display_name: data.display_name,
        password_hash,
        role: data.role,
        staff_type_id: data.staff_type_id || null,
        team_id: data.team_id || null,
      },
      select: { id: true, username: true, display_name: true, role: true, staff_type_id: true, team_id: true, created_at: true },
    });
  },
  update: async (id: string, data: any) => {
    const updateData: any = { ...data };
    if (data.password) {
      updateData.password_hash = await bcrypt.hash(data.password, 10);
      delete updateData.password;
    }
    return prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, username: true, display_name: true, role: true, staff_type_id: true, team_id: true, created_at: true },
    });
  },
  delete: (id: string) => prisma.user.delete({ where: { id } }),
};
