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
