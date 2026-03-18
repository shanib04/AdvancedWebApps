import defaultUserSvg from "../assets/default-user.svg";

export const defaultUserPhotoUrl = defaultUserSvg;

// normalize photo url with default fallback
export const normalizePhotoUrl = (value?: string): string => {
  if (!value) return defaultUserPhotoUrl;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return value;
  return value;
};
