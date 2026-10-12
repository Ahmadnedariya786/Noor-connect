/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;
declare const __BUILD_COMMIT__: string;

interface ImportMetaEnv {
  readonly VITE_BUILD_TIME: string;
  readonly VITE_BUILD_COMMIT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
