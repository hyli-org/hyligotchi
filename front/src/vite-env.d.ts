/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HYLIGOTCHI_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Module declarations for assets
declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.css' {
  const classes: { [key: string]: string };
  export default classes;
}
