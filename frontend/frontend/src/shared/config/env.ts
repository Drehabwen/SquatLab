const fallbackBaseUrl = "http://localhost:8010";

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || fallbackBaseUrl,
};
