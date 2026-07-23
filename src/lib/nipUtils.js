export const DURATION_OPTIONS = [
  { label: '7 Hari', days: 7 },
  { label: '30 Hari (1 Bulan)', days: 30 },
  { label: '90 Hari (3 Bulan)', days: 90 },
  { label: '365 Hari (1 Tahun)', days: 365 },
  { label: 'Tanpa Batas', days: null },
];

export function computeExpiresAt(days) {
  if (!days) return null;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function isExpired(expiresAt) {
  return Boolean(expiresAt) && new Date(expiresAt).getTime() <= Date.now();
}
