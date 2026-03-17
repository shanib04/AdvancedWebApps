import { AxiosError } from "axios";

export const getUserFriendlyApiError = (
  error: unknown,
  fallbackMessage: string,
) => {
  if (!(error instanceof AxiosError)) {
    return fallbackMessage;
  }

  const status = error.response?.status;
  const backendError = (error.response?.data as { error?: string })?.error;

  if (!status) {
    return "We could not reach the server. Please check your connection and try again.";
  }

  // Map specific backend errors directly if needed
  if (status === 409 && backendError) {
    if (backendError.includes("Username")) {
      return "This username is already used. Please choose another one.";
    }
    if (backendError.includes("Email")) {
      return "This email is already used. Please use a different one.";
    }
    return backendError;
  }

  if (
    status === 404 &&
    backendError === "User with this email/username not found"
  ) {
    return backendError;
  }

  if (
    status === 401 &&
    backendError === "Incorrect username, email, or password"
  ) {
    return backendError;
  }

  if (status === 400 || status === 422) {
    return "Some details are invalid. Please review your input and try again.";
  }

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "You do not have permission to do this action.";
  }

  if (status === 404) {
    return "We could not find what you requested.";
  }

  if (status === 409) {
    return "This action conflicts with existing data. Please refresh and try again.";
  }

  if (status === 429) {
    return "Too many requests. Please wait a moment and try again.";
  }

  if (status >= 500) {
    return "Something went wrong on our side. Please try again in a moment.";
  }

  return fallbackMessage;
};

export const getAiImageSearchErrorMessage = (error: unknown) => {
  if (!(error instanceof AxiosError)) {
    return "We could not fetch images right now. Please try again in a moment.";
  }

  const status = error.response?.status;
  const backendError = (
    error.response?.data as { error?: string; message?: string } | undefined
  )?.error;
  const backendMessage = (
    error.response?.data as { error?: string; message?: string } | undefined
  )?.message;
  const combinedBackendText =
    `${backendError ?? ""} ${backendMessage ?? ""}`.toLowerCase();

  if (!status) {
    return "We could not reach the image service. Please check your connection and try again.";
  }

  // Some backend paths wrap Unsplash 404 as HTTP 500 with this message.
  if (
    combinedBackendText.includes("unsplash request failed with status 404") ||
    (combinedBackendText.includes("unsplash") &&
      combinedBackendText.includes("status 404"))
  ) {
    return "No images were found for this search. Try a different keyword.";
  }

  if (status === 404) {
    return "No images were found for this search. Try a different keyword.";
  }

  return getUserFriendlyApiError(
    error,
    "We could not fetch images right now. Please try again in a moment.",
  );
};
