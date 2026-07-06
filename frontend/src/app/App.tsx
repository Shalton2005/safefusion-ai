/**
 * App – root React component
 *
 * Mounts the application router.  All layout composition, lazy loading,
 * and auth guarding happens inside AppRouter via the route definitions
 * in src/app/routes/.
 */
import { AppRouter } from './router';

export function App() {
  return <AppRouter />;
}
