// FIX: Removed the reference to "vite/client" as it was causing a "Cannot find type definition file" error.
// The application uses `process.env` (which is made available to the client via vite.config.ts)
// and does not use `import.meta.env`, so this reference is not necessary.

// FIX: Augment the NodeJS.ProcessEnv interface to include API_KEY. This avoids
// the "Cannot redeclare block-scoped variable 'process'" error by extending
// existing type definitions instead of creating a conflicting new one. This is
// the standard way to add types for environment variables in a TypeScript
// project that may include Node.js type definitions.
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}
