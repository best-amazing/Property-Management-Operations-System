// services/contact.service.ts
import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma";

export const contactInclude = {
  contact_type: true,
  properties: { include: { property: true } },
} satisfies Prisma.ContactInclude;

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

// Builds a Prisma filter from query params: search, type_id, city, state, zip,
// property_id and status ("active" | "archived" | "all").
export function buildContactWhere(query: Record<string, unknown>, defaultStatus = "active"): Prisma.ContactWhereInput {
  const where: Prisma.ContactWhereInput = {};
  const status = str(query.status) ?? defaultStatus;
  if (status !== "all") where.status = status;

  const insensitive = (value: string) => ({ equals: value, mode: "insensitive" as const });
  const city = str(query.city);
  const state = str(query.state);
  const zip = str(query.zip);
  const typeId = str(query.type_id);
  const propertyId = str(query.property_id);
  const search = str(query.search);

  if (city) where.city = insensitive(city);
  if (state) where.state = insensitive(state);
  if (zip) where.zip = { startsWith: zip };
  if (typeId) where.type_id = typeId;
  if (propertyId) where.properties = { some: { property_id: propertyId } };
  if (search) {
    const contains = { contains: search, mode: "insensitive" as const };
    where.OR = [{ name: contains }, { email: contains }, { phone: contains }, { notes: contains }, { mailing_address: contains }];
  }
  return where;
}

export function findContacts(query: Record<string, unknown>, defaultStatus = "active") {
  return prisma.contact.findMany({
    where: buildContactWhere(query, defaultStatus),
    include: contactInclude,
    orderBy: { name: "asc" },
  });
}

// Distinct values for the directory filter dropdowns, so new cities/states are
// picked up automatically as contacts are added.
export async function getContactFilterOptions(status = "active") {
  const where = status === "all" ? {} : { status };
  const [locations, types, properties] = await Promise.all([
    prisma.contact.findMany({ where, select: { city: true, state: true, zip: true } }),
    prisma.contactType.findMany({ orderBy: { name: "asc" } }),
    prisma.property.findMany({ where: { status: "active" }, orderBy: { name: "asc" }, select: { id: true, name: true, city: true, state: true } }),
  ]);
  const distinct = (values: (string | null)[]) =>
    [...new Set(values.map(v => v?.trim()).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
  return {
    cities: distinct(locations.map(l => l.city)),
    states: distinct(locations.map(l => l.state)),
    zips: distinct(locations.map(l => l.zip)),
    types,
    properties,
  };
}

const CONTACT_FIELDS = ["name", "phone", "email", "mailing_address", "city", "state", "zip", "notes", "status", "type_id"] as const;

// Whitelists writable contact fields. Returns an error message on bad input.
export function parseContact(body: Record<string, any>, partial: boolean): { error: string } | { data: Record<string, any>; propertyIds?: string[] } {
  const data: Record<string, any> = {};
  for (const field of CONTACT_FIELDS) {
    if (body[field] === undefined) continue;
    const value = typeof body[field] === "string" ? body[field].trim() : body[field];
    data[field] = value === "" && !["name", "type_id", "status"].includes(field) ? null : value;
  }
  if (!partial || data.name !== undefined) {
    if (!data.name) return { error: "Name is required" };
  }
  if (!partial || data.type_id !== undefined) {
    if (!data.type_id) return { error: "Contact type is required" };
  }
  if (data.status !== undefined && !["active", "archived"].includes(data.status)) return { error: "Invalid status" };

  let propertyIds: string[] | undefined;
  if (body.property_ids !== undefined) {
    if (!Array.isArray(body.property_ids)) return { error: "property_ids must be an array" };
    propertyIds = [...new Set<string>(body.property_ids.filter((x: unknown) => typeof x === "string" && x))];
  }
  return { data, propertyIds };
}

// ─── Bulk import (e.g. from a .vcf file parsed on the client) ────────────────

export const MAX_IMPORT_ROWS = 5000;

export type ImportRowStatus = "ready" | "created" | "duplicate" | "invalid";

export interface ImportRowResult {
  index: number;
  status: ImportRowStatus;
  error?: string;
  duplicate_of?: { id: string; name: string; reason: "email" | "phone"; in_file?: boolean };
}

const normalizeEmail = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");

// Compares numbers by their last 10 digits so "+1 (414) 555-0101" matches
// "414-555-0101". Very short values (extensions, junk) never match.
function normalizePhone(v: unknown): string {
  const digits = typeof v === "string" ? v.replace(/\D/g, "") : "";
  return digits.length >= 7 ? digits.slice(-10) : "";
}

// Validates rows and finds duplicates (against existing contacts, including
// archived ones, and earlier rows in the same file). With dryRun nothing is
// written; otherwise valid, non-duplicate rows — plus duplicates the admin
// explicitly allowed — are created in one transaction.
export async function importContacts(
  rows: Record<string, any>[],
  options: { propertyIds?: string[]; dryRun?: boolean } = {}
): Promise<{ results: ImportRowResult[]; summary: Record<ImportRowStatus, number> }> {
  const existing = await prisma.contact.findMany({ select: { id: true, name: true, email: true, phone: true } });
  const byEmail = new Map<string, { id: string; name: string; in_file?: boolean }>();
  const byPhone = new Map<string, { id: string; name: string; in_file?: boolean }>();
  for (const c of existing) {
    if (normalizeEmail(c.email)) byEmail.set(normalizeEmail(c.email), c);
    if (normalizePhone(c.phone)) byPhone.set(normalizePhone(c.phone), c);
  }

  const typeIds = new Set((await prisma.contactType.findMany({ select: { id: true } })).map(t => t.id));

  const results: ImportRowResult[] = [];
  const toCreate: { index: number; data: Record<string, any> }[] = [];

  rows.forEach((row, index) => {
    const parsed = parseContact({ ...row, status: "active", property_ids: undefined }, false);
    if ("error" in parsed) return results.push({ index, status: "invalid", error: parsed.error });
    if (!typeIds.has(parsed.data.type_id)) return results.push({ index, status: "invalid", error: "Unknown contact type" });

    const email = normalizeEmail(parsed.data.email);
    const phone = normalizePhone(parsed.data.phone);
    const match = (email && byEmail.get(email)) || (phone && byPhone.get(phone)) || undefined;
    if (match && !row.allow_duplicate) {
      const reason = email && byEmail.get(email) === match ? "email" : "phone";
      return results.push({ index, status: "duplicate", duplicate_of: { id: match.id, name: match.name, reason, in_file: match.in_file } });
    }

    // Later rows in the same file are checked against this one
    const self = { id: `row-${index}`, name: parsed.data.name, in_file: true };
    if (email && !byEmail.has(email)) byEmail.set(email, self);
    if (phone && !byPhone.has(phone)) byPhone.set(phone, self);

    results.push({ index, status: "ready" });
    toCreate.push({ index, data: parsed.data });
  });

  if (!options.dryRun && toCreate.length) {
    const propertyIds = options.propertyIds ?? [];
    await prisma.$transaction(async tx => {
      const created = await tx.contact.createManyAndReturn({
        data: toCreate.map(r => r.data as Prisma.ContactCreateManyInput),
        select: { id: true },
      });
      if (propertyIds.length) {
        await tx.propertyContact.createMany({
          data: created.flatMap(c => propertyIds.map(property_id => ({ contact_id: c.id, property_id }))),
          skipDuplicates: true,
        });
      }
    }, { timeout: 60_000 });
    for (const r of toCreate) results[r.index].status = "created";
  }

  const summary: Record<ImportRowStatus, number> = { ready: 0, created: 0, duplicate: 0, invalid: 0 };
  results.forEach(r => summary[r.status]++);
  return { results, summary };
}

export async function saveContact(id: string | null, data: Record<string, any>, propertyIds?: string[]) {
  return prisma.$transaction(async tx => {
    const contact = id
      ? await tx.contact.update({ where: { id }, data })
      : await tx.contact.create({ data: data as Prisma.ContactUncheckedCreateInput });
    if (propertyIds) {
      await tx.propertyContact.deleteMany({ where: { contact_id: contact.id } });
      if (propertyIds.length) {
        await tx.propertyContact.createMany({
          data: propertyIds.map(property_id => ({ contact_id: contact.id, property_id })),
          skipDuplicates: true,
        });
      }
    }
    return tx.contact.findUniqueOrThrow({ where: { id: contact.id }, include: contactInclude });
  });
}

// ─── Bulk edit ────────────────────────────────────────────────────────────────

export const MAX_BULK_UPDATE = 5000;

// Fields that can be set on many contacts at once. Name, phone, email and
// address are per-person, so they're only edited one contact at a time.
const BULK_FIELDS = ["type_id", "city", "state", "zip", "status"] as const;

export type BulkPropertyMode = "add" | "remove" | "replace";

export function parseBulkUpdate(body: Record<string, any>):
  { error: string } | { ids: string[]; data: Record<string, any>; properties?: { mode: BulkPropertyMode; ids: string[] } } {
  const { ids, changes, properties } = body ?? {};
  if (!Array.isArray(ids) || !ids.length || ids.some(id => typeof id !== "string")) return { error: "ids must be a non-empty array of contact ids" };
  if (ids.length > MAX_BULK_UPDATE) return { error: `Too many contacts (${ids.length}). The limit is ${MAX_BULK_UPDATE} per bulk edit.` };

  const raw = changes && typeof changes === "object" ? changes : {};
  const unknown = Object.keys(raw).filter(k => !(BULK_FIELDS as readonly string[]).includes(k));
  if (unknown.length) return { error: `These fields can't be bulk edited: ${unknown.join(", ")}` };
  const parsed = parseContact(raw, true);
  if ("error" in parsed) return parsed;

  let props: { mode: BulkPropertyMode; ids: string[] } | undefined;
  if (properties !== undefined && properties !== null) {
    if (!["add", "remove", "replace"].includes(properties.mode)) return { error: "properties.mode must be add, remove or replace" };
    if (!Array.isArray(properties.ids) || properties.ids.some((x: unknown) => typeof x !== "string")) return { error: "properties.ids must be an array of strings" };
    props = { mode: properties.mode, ids: [...new Set<string>(properties.ids)] };
  }
  if (!Object.keys(parsed.data).length && !props) return { error: "Nothing to change" };
  return { ids: [...new Set<string>(ids)], data: parsed.data, properties: props };
}

export async function bulkUpdateContacts(ids: string[], data: Record<string, any>, properties?: { mode: BulkPropertyMode; ids: string[] }) {
  return prisma.$transaction(async tx => {
    const { count } = Object.keys(data).length
      ? await tx.contact.updateMany({ where: { id: { in: ids } }, data })
      : { count: await tx.contact.count({ where: { id: { in: ids } } }) };

    if (properties) {
      if (properties.mode !== "add") {
        await tx.propertyContact.deleteMany({
          where: { contact_id: { in: ids }, ...(properties.mode === "remove" ? { property_id: { in: properties.ids } } : {}) },
        });
      }
      if (properties.mode !== "remove" && properties.ids.length) {
        await tx.propertyContact.createMany({
          data: ids.flatMap(contact_id => properties.ids.map(property_id => ({ contact_id, property_id }))),
          skipDuplicates: true,
        });
      }
      // Property links don't touch the contact row, so bump updated_at here
      if (!Object.keys(data).length) {
        await tx.contact.updateMany({ where: { id: { in: ids } }, data: { updated_at: new Date() } });
      }
    }
    return { updated: count };
  }, { timeout: 30_000 });
}
