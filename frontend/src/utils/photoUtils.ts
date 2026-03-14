export const defaultUserPhotoUrl = "/public/images/default-user.svg";

export const normalizePhotoUrl = (value?: string): string => {
  if (!value) return defaultUserPhotoUrl;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return value;
  return value;
};
