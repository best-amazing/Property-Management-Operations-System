import { Router } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../utils/prisma";
import { resolveUserNames } from "../../services/announcement.service";

const router = Router();

const POLICY_STATUSES = ["draft", "published", "archived"];

const isKnownError = (e: unknown, code: string) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === code;

const trimOrNull = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

// Attachments are stored as [{ name, url }]; legacy entries may be bare URLs.
function parseAttachments(value: unknown): { name: string; url: string }[] | { error: string } {
  if (!Array.isArray(value)) return { error: "attachments must be an array" };
  const out: { name: string; url: string }[] = [];
  for (const item of value) {
    const url = typeof item === "string" ? item.trim() : trimOrNull(item?.url);
    if (!url) continue;
    if (!/^https?:\/\//i.test(url)) return { error: `Attachment URL must start with http:// or https:// (${url})` };
    const name = typeof item === "string" ? url : trimOrNull(item?.name) || url;
    out.push({ name, url });
  }
  return out;
}

function parseStaffTypeIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value.filter((x): x is string => typeof x === "string" && !!x);
  return ids.length ? ids : null;
}

// Sets `order` to each id's position in the list.
async function applyOrder(model: "policy" | "policyCategory", ids: unknown) {
  if (!Array.isArray(ids) || ids.some(id => typeof id !== "string")) throw new Error("ids must be an array of strings");
  await prisma.$transaction(
    (ids as string[]).map((id, order) =>
      model === "policy"
        ? prisma.policy.update({ where: { id }, data: { order } })
        : prisma.policyCategory.update({ where: { id }, data: { order } })
    )
  );
}

// ─── Categories (configurable dashboard sections) ─────────────────────────────

// GET /admin/policies/categories
router.get("/categories", async (_req, res) => {
  try {
    const categories = await prisma.policyCategory.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: { _count: { select: { policies: true } } },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// POST /admin/policies/categories
router.post("/categories", async (req, res) => {
  try {
    const name = trimOrNull(req.body.name);
    if (!name) return res.status(400).json({ error: "Name is required" });
    const last = await prisma.policyCategory.aggregate({ _max: { order: true } });
    const category = await prisma.policyCategory.create({
      data: {
        name,
        description: trimOrNull(req.body.description),
        order: typeof req.body.order === "number" ? req.body.order : (last._max.order ?? -1) + 1,
        audience_staff_types: parseStaffTypeIds(req.body.audience_staff_types) ?? Prisma.DbNull,
      },
    });
    res.status(201).json(category);
  } catch (error) {
    if (isKnownError(error, "P2002")) return res.status(409).json({ error: "A category with that name already exists" });
    res.status(500).json({ error: "Failed to create category" });
  }
});

// PUT /admin/policies/categories/reorder  { ids: string[] }
router.put("/categories/reorder", async (req, res) => {
  try {
    await applyOrder("policyCategory", req.body.ids);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message || "Failed to reorder categories" });
  }
});

// PUT /admin/policies/categories/:id
router.put("/categories/:id", async (req, res) => {
  try {
    const data: Prisma.PolicyCategoryUpdateInput = {};
    if (req.body.name !== undefined) {
      const name = trimOrNull(req.body.name);
      if (!name) return res.status(400).json({ error: "Name is required" });
      data.name = name;
    }
    if (req.body.description !== undefined) data.description = trimOrNull(req.body.description);
    if (typeof req.body.order === "number") data.order = req.body.order;
    if (req.body.audience_staff_types !== undefined) {
      data.audience_staff_types = parseStaffTypeIds(req.body.audience_staff_types) ?? Prisma.DbNull;
    }
    const category = await prisma.policyCategory.update({ where: { id: req.params.id }, data });
    res.json(category);
  } catch (error) {
    if (isKnownError(error, "P2002")) return res.status(409).json({ error: "A category with that name already exists" });
    if (isKnownError(error, "P2025")) return res.status(404).json({ error: "Category not found" });
    res.status(500).json({ error: "Failed to update category" });
  }
});

// DELETE /admin/policies/categories/:id — only when it holds no policies
router.delete("/categories/:id", async (req, res) => {
  try {
    const count = await prisma.policy.count({ where: { category_id: req.params.id } });
    if (count) return res.status(400).json({ error: `This category holds ${count} item(s). Move or archive them first.` });
    await prisma.policyCategory.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// ─── Policies & documentation ─────────────────────────────────────────────────

// GET /admin/policies
router.get("/", async (_req, res) => {
  try {
    const policies = await prisma.policy.findMany({
      include: { category: true },
      orderBy: [{ category: { order: "asc" } }, { order: "asc" }, { created_at: "asc" }],
    });
    const names = await resolveUserNames(policies.flatMap(p => [p.created_by, p.updated_by]));
    res.json(policies.map(p => ({
      ...p,
      created_by_name: names[p.created_by],
      updated_by_name: p.updated_by ? names[p.updated_by] : undefined,
    })));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch policies" });
  }
});

// POST /admin/policies
router.post("/", async (req, res) => {
  try {
    const { title, content, category_id, status } = req.body;
    if (!trimOrNull(title)) return res.status(400).json({ error: "Title is required" });
    if (!category_id) return res.status(400).json({ error: "Category is required" });
    if (status !== undefined && !POLICY_STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status" });
    const attachments = parseAttachments(req.body.attachments ?? []);
    if ("error" in attachments) return res.status(400).json({ error: attachments.error });

    const userId = (req as any).user?.id || "system";
    const last = await prisma.policy.aggregate({ where: { category_id }, _max: { order: true } });
    const policy = await prisma.policy.create({
      data: {
        title: title.trim(),
        description: trimOrNull(req.body.description),
        content: typeof content === "string" ? content : "",
        category_id,
        status: status || "draft",
        order: typeof req.body.order === "number" ? req.body.order : (last._max.order ?? -1) + 1,
        attachments,
        created_by: userId,
        updated_by: userId,
      },
      include: { category: true },
    });
    res.status(201).json(policy);
  } catch (error) {
    console.error("Failed to create policy:", error);
    res.status(500).json({ error: "Failed to create policy" });
  }
});

// PUT /admin/policies/reorder  { ids: string[] }
router.put("/reorder", async (req, res) => {
  try {
    await applyOrder("policy", req.body.ids);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message || "Failed to reorder policies" });
  }
});

// PUT /admin/policies/:id
router.put("/:id", async (req, res) => {
  try {
    const data: Prisma.PolicyUncheckedUpdateInput = { updated_by: (req as any).user?.id || "system" };
    if (req.body.title !== undefined) {
      const title = trimOrNull(req.body.title);
      if (!title) return res.status(400).json({ error: "Title is required" });
      data.title = title;
    }
    if (req.body.description !== undefined) data.description = trimOrNull(req.body.description);
    if (req.body.content !== undefined) data.content = String(req.body.content ?? "");
    if (req.body.category_id !== undefined) data.category_id = req.body.category_id;
    if (typeof req.body.order === "number") data.order = req.body.order;
    if (req.body.status !== undefined) {
      if (!POLICY_STATUSES.includes(req.body.status)) return res.status(400).json({ error: "Invalid status" });
      data.status = req.body.status;
    }
    if (req.body.attachments !== undefined) {
      const attachments = parseAttachments(req.body.attachments);
      if ("error" in attachments) return res.status(400).json({ error: attachments.error });
      data.attachments = attachments;
    }
    const policy = await prisma.policy.update({ where: { id: req.params.id }, data, include: { category: true } });
    res.json(policy);
  } catch (error) {
    if (isKnownError(error, "P2025")) return res.status(404).json({ error: "Policy not found" });
    res.status(500).json({ error: "Failed to update policy" });
  }
});

// DELETE /admin/policies/:id — archives rather than deletes
router.delete("/:id", async (req, res) => {
  try {
    const policy = await prisma.policy.update({
      where: { id: req.params.id },
      data: { status: "archived", updated_by: (req as any).user?.id || "system" },
    });
    res.json(policy);
  } catch (error) {
    res.status(500).json({ error: "Failed to archive policy" });
  }
});

export default router;
