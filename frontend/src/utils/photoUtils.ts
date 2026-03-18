import defaultUserSvg from "../assets/default-user.svg";

export const defaultUserPhotoUrl = defaultUserSvg;

// returns default svg if value is empty, passes through absolute or relative urls as-is
export const normalizePhotoUrl = (value?: string): string => {
  if (!value) return defaultUserPhotoUrl;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return value;
  return value;
};
