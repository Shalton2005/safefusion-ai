import { useThemeStore } from '@/store';
import type { Theme } from '@/types';

export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const toggleTheme = () => {
    const next: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return { theme, resolvedTheme, setTheme, toggleTheme };
}
