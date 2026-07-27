// Colour palette from the HTML mockup
const PALETTE = [
  { name: 'Rust',     color: '#B23A2E', soft: '#F6DEDA' },
  { name: 'Amber',   color: '#D98E3B', soft: '#F8E9D3' },
  { name: 'Pine',    color: '#1F4B43', soft: '#E4ECE9' },
  { name: 'Slate',   color: '#5B6660', soft: '#E7E9E5' },
  { name: 'Plum',    color: '#6B3F69', soft: '#EBE0EA' },
  { name: 'Teal',    color: '#1E6E73', soft: '#DCEBEC' },
  { name: 'Coral',   color: '#C75450', soft: '#F5DEDC' },
  { name: 'Graphite',color: '#33403B', soft: '#E2E6E3' },
];

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

export function swatchByName(name: string) {
  return PALETTE.find(p => p.name === name) || PALETTE[3];
}

export function avatarSwatch(name: string) {
  return PALETTE[hashStr(name || '?') % PALETTE.length];
}

export function initials(name: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || name[0].toUpperCase();
}

export function ageDays(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

export function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
