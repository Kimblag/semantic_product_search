import axios from "axios";
import { api } from "./api";

let accessToken: string | null = null;

export function setAccessToken(token: string) {
  accessToken = token;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = await axios.post(
        "http://localhost:8000/api/refresh",
        {},
        { withCredentials: true },
      );

      accessToken = refresh.data.access_token;

      error.config.headers.Authorization = `Bearer ${accessToken}`;

      return api(error.config);
    }

    return Promise.reject(error);
  },
);
