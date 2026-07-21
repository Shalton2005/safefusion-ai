import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui';
import { useThemeStore } from '@/store';
import { userService } from '@/services';
import { toast } from '@/store/useNotificationStore';
import { ApiError } from '@/api/errors';
import { cn } from '@/lib/cn';
import type { Theme } from '@/types';

const THEME_OPTIONS: { value: Theme; label: string; description: string }[] = [
  { value: 'light',  label: 'Light',  description: 'White background, high contrast' },
  { value: 'dark',   label: 'Dark',   description: 'Dark background, easy on the eyes' },
  { value: 'system', label: 'System', description: 'Follow system preference' },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useThemeStore();
  const [saving, setSaving] = useState(false);

  const handleThemeChange = async (newTheme: Theme) => {
    // Apply instantly via zustand and localStorage
    setTheme(newTheme);
    
    // Save to backend
    setSaving(true);
    try {
      await userService.updatePreferences({ theme: newTheme });
      toast.success('Theme Saved', 'Your appearance preferences have been synced.');
    } catch (err) {
      toast.error('Sync failed', 'Failed to save theme to backend. It will still apply locally.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Appearance" description="Customise the platform look and feel" />
      <div className="space-y-3 mt-4 p-4 pt-0">
        <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[var(--sf-text-primary)]">Theme</p>
            {saving && <span className="text-xs text-[var(--sf-text-tertiary)]">Syncing to backend...</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleThemeChange(opt.value)}
              disabled={saving}
              className={cn(
                'flex flex-col items-start gap-1 p-4 rounded-lg border-2 text-left transition-colors',
                theme === opt.value
                  ? 'border-primary-500 bg-primary-600/10'
                  : 'border-[var(--sf-border-default)] hover:border-[var(--sf-text-tertiary)]',
                 saving && 'opacity-70 cursor-not-allowed'
              )}
            >
              <p className="text-sm font-semibold text-[var(--sf-text-primary)]">{opt.label}</p>
              <p className="text-xs text-[var(--sf-text-tertiary)]">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
