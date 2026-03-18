import axios from "axios";
import apiClient from "../services/api-client";
import { normalizePhotoUrl } from "./photoUtils";

export type SessionUser = {
  _id?: string;
  photoUrl?: string;
  displayName?: string;
  bio?: string;
  username?: string;
  name?: string;
  email?: string;
};

const USER_STORAGE_KEY = "user";

// read session user from localStorage - returns null if missing or invalid json
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

// normalize user object - handles legacy imageUrl field from older api responses
export const normalizeSessionUser = (user: SessionUser): SessionUser => {
  const legacyImageUrl = (user as SessionUser & { imageUrl?: string }).imageUrl;
  const rawPhoto = user.photoUrl || legacyImageUrl;
  const { ...fullUser } = user as SessionUser & {
    imageUrl?: string;
  };

  return {
    ...fullUser,
    photoUrl: normalizePhotoUrl(rawPhoto),
  };
};

// save user to localStorage and broadcast a custom event so other components update immediately
export const setStoredSessionUser = (user: SessionUser) => {
  const normalized = normalizeSessionUser(user);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalized));

  // Dispatch custom event for same-tab updates
  window.dispatchEvent(
    new CustomEvent("sessionUserUpdated", { detail: normalized }),
  );

  return normalized;
};

// fetch fresh user data from /user/whoami and merge into session - redirects on 401 or 404
export const syncStoredUserFromWhoAmI = async (
  fallbackUser: SessionUser | null,
) => {
  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) {
    return fallbackUser;
  }

  try {
    const response = await apiClient.get("/user/whoami");
    const serverUser = (response.data ?? {}) as SessionUser;

    const mergedUser = normalizeSessionUser({
      ...(fallbackUser ?? {}),
      ...serverUser,
      photoUrl: serverUser?.photoUrl || fallbackUser?.photoUrl,
    });

    return setStoredSessionUser(mergedUser);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 401 || error.response.status === 404) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem(USER_STORAGE_KEY);
        window.location.href = "/login";
      }
    }
    throw error;
  }
};
