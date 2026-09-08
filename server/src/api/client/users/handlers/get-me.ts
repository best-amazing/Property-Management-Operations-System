import { Request, Response } from "express";

import prisma from "../../../../utils/prisma";

export const getMeHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = (req as any).user;
    if (!userPayload) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userPayload.id },
      select: {
        id: true,
        username: true,
        display_name: true,
        role: true,
        created_at: true,
        staff_type_id: true,
        team_id: true,
        staff_type: {
          select: {
            id: true,
            name: true,
            permissions: true,
            allowed_departments: true,
            allowed_pipelines: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            lead_id: true,
            members: {
              select: {
                id: true,
                display_name: true,
                staff_type: {
                  select: {
                    allowed_departments: true,
                    allowed_pipelines: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
