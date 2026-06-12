/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: {
    readonly VITE_API_BASE_URL?: string;
    [key: string]: unknown;
  };
}

declare module "*.svg" {
  const content: string;
  export default content;
}
