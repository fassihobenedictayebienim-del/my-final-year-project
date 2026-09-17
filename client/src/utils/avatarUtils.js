// Generates 2-3 initials from a full name (e.g. "Fassiho Benedict Ayebienim" -> "FBA")
export function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const initials = parts.slice(0, 3).map((p) => p[0]).join('');
  return initials.toUpperCase();
}

// Deterministic colour from a stable identity (user_id) so the same user
// always gets the same colour, without storing anything extra.
const PALETTE = [
  '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c',
  '#d97706', '#16a34a', '#0d9488', '#0891b2', '#4f46e5',
];

export function getAvatarColor(seed) {
  const str = String(seed || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}