import { APP_NAME, APP_VERSION } from '@/constants';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="flex items-center justify-between px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg-card)] text-2xs text-[var(--color-text-muted)]">
      <span>
        &copy; {year} {APP_NAME}. All rights reserved.
      </span>
      <span>v{APP_VERSION}</span>
    </footer>
  );
}
