/**
 * Centralised env config – all VITE_ vars accessed through this module
 * so the rest of the app never calls import.meta.env directly.
 */
const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1',
  appName:    import.meta.env.VITE_APP_NAME    ?? 'SafeFusion AI',
  appVersion: import.meta.env.VITE_APP_VERSION ?? '0.1.0',
  appEnv:     import.meta.env.VITE_APP_ENV     ?? 'development',
  isDev:      import.meta.env.DEV,
  isProd:     import.meta.env.PROD,
} as const;

export default env;
