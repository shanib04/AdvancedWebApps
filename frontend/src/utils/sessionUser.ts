import axios from "axios";
import apiClient from "../services/api-client";
import { normalizePhotoUrl } from "./photoUtils";

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

export const normalizeSessionUser = (user: SessionUser): SessionUser => {
  const rawPhoto = user.photoUrl || user.imageUrl;

  return {
    ...user,
    photoUrl: normalizePhotoUrl(rawPhoto),
  };
};

export const setStoredSessionUser = (user: SessionUser) => {
  const normalized = normalizeSessionUser(user);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
};

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

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mergedUser));
    return mergedUser;
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
