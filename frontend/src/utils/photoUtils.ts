const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
export const defaultUserPhotoUrl = `${apiBaseUrl}/public/images/default-user.svg`;

export const normalizePhotoUrl = (value?: string): string => {
  if (!value) return defaultUserPhotoUrl;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${apiBaseUrl}${value}`;
  return value;
};
