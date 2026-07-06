import { useThemeStore } from '@/store';
import type { Theme } from '@/types';

export function useTheme() {
  const { theme, resolvedTheme, setTheme } = useThemeStore();

  const toggleTheme = () => {
    const next: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return { theme, resolvedTheme, setTheme, toggleTheme };
}
