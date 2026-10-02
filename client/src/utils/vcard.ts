// Minimal vCard (.vcf) parser for contact import.
//
// Handles the formats real exports use: vCard 2.1 (Outlook, older Android —
// bare TYPE params, QUOTED-PRINTABLE + CHARSET), 3.0 (iPhone, Google) and 4.0.
// Supports line folding, LF/CRLF line endings, "item1." property groups,
// escaped text (\n \, \; \\) and multiple cards per file. Binary values
// (PHOTO, LOGO, …) are skipped.

export interface ParsedVCardContact {
  name: string;
  phone: string;
  email: string;
  mailing_address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
  categories: string[];
}

interface Property {
  name: string;
  params: Record<string, string[]>; // upper-cased keys; bare 2.1 params go under TYPE
  value: string; // raw (still escaped) but decoded from QP
}

const US_COUNTRIES = new Set(["", "us", "usa", "united states", "united states of america"]);

function decodeQuotedPrintable(value: string, charset: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "=" && /^[0-9A-Fa-f]{2}$/.test(value.slice(i + 1, i + 3))) {
      bytes.push(parseInt(value.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      // Non-ASCII characters can appear unencoded; keep their UTF-8 bytes
      bytes.push(...new TextEncoder().encode(ch));
    }
  }
  try {
    return new TextDecoder(charset || "utf-8").decode(new Uint8Array(bytes));
  } catch {
    return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  }
}

// Splits on a separator that is not escaped with a backslash.
function splitUnescaped(value: string, sep: string): string[] {
  const parts: string[] = [];
  let current = "";
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "\\" && i + 1 < value.length) {
      current += value[i] + value[i + 1];
      i++;
    } else if (value[i] === sep) {
      parts.push(current);
      current = "";
    } else {
      current += value[i];
    }
  }
  parts.push(current);
  return parts;
}

function unescapeText(value: string): string {
  return value.replace(/\\([nN,;\\:])/g, (_, c: string) => (c === "n" || c === "N" ? "\n" : c));
}

function parseLine(line: string): Property | null {
  // The value starts at the first ':' that isn't inside a quoted param value
  let inQuotes = false;
  let colon = -1;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') inQuotes = !inQuotes;
    else if (line[i] === ":" && !inQuotes) { colon = i; break; }
  }
  if (colon === -1) return null;

  const [rawName, ...rawParams] = line.slice(0, colon).split(";");
  const name = rawName.replace(/^[^.]*\./, "").toUpperCase(); // drop "item1." group
  const params: Record<string, string[]> = {};
  for (const p of rawParams) {
    const eq = p.indexOf("=");
    const key = eq === -1 ? "TYPE" : p.slice(0, eq).toUpperCase();
    const values = (eq === -1 ? p : p.slice(eq + 1)).replace(/"/g, "").split(",").map(v => v.trim().toUpperCase());
    // vCard 2.1 writes encodings/charsets as bare params too, e.g. "QUOTED-PRINTABLE"
    if (eq === -1 && ["QUOTED-PRINTABLE", "BASE64", "B"].includes(values[0])) {
      (params.ENCODING ??= []).push(values[0]);
    } else {
      (params[key] ??= []).push(...values);
    }
  }

  let value = line.slice(colon + 1);
  if (params.ENCODING?.includes("QUOTED-PRINTABLE")) {
    value = decodeQuotedPrintable(value, params.CHARSET?.[0] ?? "utf-8");
  }
  return { name, params, value };
}

// Splits raw text into unfolded logical lines.
function logicalLines(text: string): string[] {
  const physical = text.replace(/^﻿/, "").split(/\r\n|\r|\n/);
  const lines: string[] = [];
  for (const line of physical) {
    const prev = lines.length - 1;
    // QP soft line break is checked first: its continuation may begin with
    // whitespace that is part of the value, unlike RFC folding.
    if (prev >= 0 && /QUOTED-PRINTABLE/i.test(lines[prev].split(":")[0]) && lines[prev].endsWith("=")) {
      lines[prev] = lines[prev].slice(0, -1) + line;
    } else if (prev >= 0 && /^[ \t]/.test(line)) {
      lines[prev] += line.slice(1); // RFC folding: continuation starts with whitespace
    } else {
      lines.push(line);
    }
  }
  return lines;
}

const hasType = (p: Property, type: string) => p.params.TYPE?.includes(type) ?? false;
const isPreferred = (p: Property) => hasType(p, "PREF") || p.params.PREF !== undefined;

// Picks the preferred property, then one with a matching type, then the first.
function pick(props: Property[], ...types: string[]): Property | undefined {
  return props.find(isPreferred) ?? types.map(t => props.find(p => hasType(p, t))).find(Boolean) ?? props[0];
}

function toContact(props: Property[]): ParsedVCardContact {
  const all = (name: string) =>
    props.filter(p => p.name === name && !p.params.ENCODING?.some(e => e === "B" || e === "BASE64"));
  const text = (p?: Property) => (p ? unescapeText(p.value).trim() : "");
  const components = (p?: Property) => (p ? splitUnescaped(p.value, ";").map(c => unescapeText(c).trim()) : []);

  const fn = text(all("FN")[0]);
  const [family = "", given = "", middle = "", prefix = "", suffix = ""] = components(all("N")[0]);
  const fromN = [prefix, given, middle, family, suffix].filter(Boolean).join(" ");
  const org = components(all("ORG")[0]).filter(Boolean).join(" - ");

  const phones = all("TEL");
  const emails = all("EMAIL");
  const phone = pick(phones, "CELL", "WORK");
  const email = pick(emails, "WORK", "INTERNET");

  const name = fn || fromN || org || text(email);

  const adr = pick(all("ADR"), "WORK");
  const [pobox = "", extended = "", street = "", city = "", region = "", postal = "", country = ""] = components(adr);
  const addressParts = [pobox && `PO Box ${pobox}`, street, extended].filter(Boolean).map(s => s.replace(/\s*\n\s*/g, ", "));
  if (!US_COUNTRIES.has(country.toLowerCase())) addressParts.push(country);

  const noteParts: string[] = [];
  if (org && org !== name) noteParts.push(`Company: ${org}`);
  const otherPhones = phones.filter(p => p !== phone).map(p => text(p)).filter(Boolean);
  const otherEmails = emails.filter(e => e !== email).map(e => text(e)).filter(Boolean);
  if (otherPhones.length) noteParts.push(`Other phones: ${otherPhones.join(", ")}`);
  if (otherEmails.length) noteParts.push(`Other emails: ${otherEmails.join(", ")}`);
  const note = all("NOTE").map(text).filter(Boolean).join("\n");
  if (note) noteParts.push(note);

  return {
    name,
    phone: text(phone),
    email: text(email),
    mailing_address: addressParts.join(", "),
    city,
    state: region,
    zip: postal,
    notes: noteParts.join("\n"),
    categories: all("CATEGORIES").flatMap(p => splitUnescaped(p.value, ",").map(c => unescapeText(c).trim())).filter(Boolean),
  };
}

// Parses every card in a .vcf file. Cards without a usable name are still
// returned (with name = "") so the caller can report them.
export function parseVCards(text: string): ParsedVCardContact[] {
  const contacts: ParsedVCardContact[] = [];
  let current: Property[] | null = null;
  for (const line of logicalLines(text)) {
    const upper = line.trim().toUpperCase();
    if (upper === "BEGIN:VCARD") {
      current = [];
    } else if (upper === "END:VCARD") {
      if (current) contacts.push(toContact(current));
      current = null;
    } else if (current && line.trim()) {
      const prop = parseLine(line);
      if (prop) current.push(prop);
    }
  }
  if (current?.length) contacts.push(toContact(current)); // tolerate a missing END:VCARD
  return contacts;
}
