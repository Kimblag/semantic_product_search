import type { AxiosError } from "axios";
import axios from "axios";

type ApiErrorPayload = {
  message?: string | string[];
};

export function getAxiosErrorMessage(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null;

  const axiosError = error as AxiosError<ApiErrorPayload>;
  const payloadMessage = axiosError.response?.data?.message;

  if (Array.isArray(payloadMessage)) {
    return payloadMessage.join(". ");
  }

  if (typeof payloadMessage === "string" && payloadMessage.trim().length > 0) {
    return payloadMessage;
  }

  return null;
}

export function getAxiosStatus(error: unknown): number | null {
  if (!axios.isAxiosError(error)) return null;
  return error.response?.status ?? null;
}
