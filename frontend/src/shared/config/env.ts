// Use relative path in dev (goes through Vite proxy).
// In production (Capacitor), set custom_api_base_url in localStorage or VITE_API_BASE_URL env var.
const fallbackBaseUrl = import.meta.env.PROD ? (import.meta.env.VITE_API_BASE_URL || "") : "";

const deriveRehabHubBaseUrl = () => {
  const explicitHubUrl = import.meta.env.VITE_REHAB_HUB_API_BASE_URL;
  if (explicitHubUrl) return explicitHubUrl;

  const screeningBackendUrl =
    localStorage.getItem("custom_api_base_url") || import.meta.env.VITE_API_BASE_URL;

  if (screeningBackendUrl) {
    try {
      const url = new URL(screeningBackendUrl);
      url.port = "8000";
      url.pathname = "";
      url.search = "";
      url.hash = "";
      return url.toString().replace(/\/$/, "");
    } catch {
      // Fallback to localhost below.
    }
  }

  return "http://localhost:8000";
};

export const env = {
  get apiBaseUrl() {
    return localStorage.getItem("custom_api_base_url") || import.meta.env.VITE_API_BASE_URL || fallbackBaseUrl;
  },
  set apiBaseUrl(url: string) {
    if (url) {
      localStorage.setItem("custom_api_base_url", url);
    } else {
      localStorage.removeItem("custom_api_base_url");
    }
  },
  get rehabHubApiBaseUrl() {
    return localStorage.getItem("rehab_hub_api_base_url") || deriveRehabHubBaseUrl();
  },
  set rehabHubApiBaseUrl(url: string) {
    if (url) {
      localStorage.setItem("rehab_hub_api_base_url", url);
    } else {
      localStorage.removeItem("rehab_hub_api_base_url");
    }
  }
};
