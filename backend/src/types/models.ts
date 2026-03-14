import { Response } from "express";

export type HandlerResponse = Promise<Response | void>;

export type JwtDecodedPayload = {
  userId: string;
};

export type Tokens = {
  accessToken: string;
  refreshToken: string;
};

export type UserUpdateFields = {
  username?: string;
  email?: string;
  password?: string;
  photoUrl?: string;
  displayName?: string;
  bio?: string;
};

export type InitialDraftResponse = {
  text: string;
  keyword: string;
  images: string[];
};

export type ParsedInitialDraft = {
  text: string;
  keywords: string[];
};
