import apiClient from "../services/api-client";

export type SessionUser = {
  _id?: string;
  photoUrl?: string;
  displayName?: string;
  username?: string;
  name?: string;
  email?: string;
  imageUrl?: string;
};

const USER_STORAGE_KEY = "user";

export const getStoredSessionUser = (): SessionUser | null => {
  const storedUser = localStorage.getItem(USER_STORAGE_KEY);
  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as SessionUser;
  } catch {
    return null;
  }
};

export const normalizeSessionUser = (
  user: SessionUser,
  normalizePhotoUrl?: (value?: string) => string,
): SessionUser => {
  const rawPhoto = user.photoUrl || user.imageUrl;

  return {
    ...user,
    photoUrl: normalizePhotoUrl ? normalizePhotoUrl(rawPhoto) : rawPhoto,
  };
};

export const setStoredSessionUser = (
  user: SessionUser,
  normalizePhotoUrl?: (value?: string) => string,
) => {
  const normalized = normalizeSessionUser(user, normalizePhotoUrl);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
};

export const syncStoredUserFromWhoAmI = async (
  fallbackUser: SessionUser | null,
  normalizePhotoUrl?: (value?: string) => string,
) => {
  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) {
    return fallbackUser;
  }

  const response = await apiClient.get("/user/whoami");
  const serverUser = (response.data ?? {}) as SessionUser;

  const mergedUser = normalizeSessionUser(
    {
      ...(fallbackUser ?? {}),
      ...serverUser,
      photoUrl: serverUser?.photoUrl || fallbackUser?.photoUrl,
    },
    normalizePhotoUrl,
  );

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mergedUser));
  return mergedUser;
};
