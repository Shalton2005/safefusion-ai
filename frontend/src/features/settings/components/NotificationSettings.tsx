import { useState, useEffect } from 'react';
import { Card, CardHeader, Badge } from '@/components/ui';
import { userService, type UserPreferencesUpdate } from '@/services';
import { toast } from '@/store/useNotificationStore';
import { ApiError } from '@/api/errors';

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<UserPreferencesUpdate>({
    critical_alerts: true,
    high_severity_alerts: true,
    daily_summary: false,
    system_maintenance: true,
  });
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof UserPreferencesUpdate | null>(null);

  useEffect(() => {
    async function loadPrefs() {
      try {
        const data = await userService.getPreferences();
        setPreferences(prev => ({ ...prev, ...data.preferences }));
      } catch (err) {
        toast.error('Failed to load preferences', ApiError.from(err).toUserMessage());
      } finally {
        setLoading(false);
      }
    }
    loadPrefs();
  }, []);

  const handleToggle = async (key: keyof UserPreferencesUpdate) => {
    const newValue = !preferences[key];
    
    // Optimistic UI update
    setPreferences(prev => ({ ...prev, [key]: newValue }));
    setSavingKey(key);

    try {
      await userService.updatePreferences({ [key]: newValue });
      toast.success('Preferences Updated', 'Your notification settings have been saved.');
    } catch (err) {
      // Revert on error
      setPreferences(prev => ({ ...prev, [key]: !newValue }));
      toast.error('Failed to save preference', ApiError.from(err).toUserMessage());
    } finally {
      setSavingKey(null);
    }
  };

  const options = [
    { key: 'critical_alerts', label: 'Critical Alerts', description: 'Immediate notifications for critical safety events' },
    { key: 'high_severity_alerts', label: 'High Severity Alerts', description: 'Alerts for high severity incidents' },
    { key: 'daily_summary', label: 'Daily Summary', description: 'End-of-day digest of all activities' },
    { key: 'system_maintenance', label: 'System Maintenance', description: 'Planned downtime and maintenance windows' },
  ] as const;

  return (
    <Card>
      <CardHeader title="Notifications" description="Choose which alerts you receive" />
      <div className="space-y-1 mt-2 p-4 pt-0">
        {loading ? (
          <div className="text-sm text-[var(--sf-text-secondary)]">Loading preferences...</div>
        ) : (
          options.map((opt) => {
            const isEnabled = !!preferences[opt.key as keyof UserPreferencesUpdate];
            const isSaving = savingKey === opt.key;
            
            return (
              <div 
                key={opt.key} 
                className="flex items-center justify-between py-3 border-b border-[var(--sf-border-default)] last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--sf-text-primary)]">{opt.label}</p>
                  <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">{opt.description}</p>
                </div>
                <button
                  onClick={() => handleToggle(opt.key)}
                  disabled={isSaving}
                  className="transition-opacity focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-1"
                >
                  {isSaving ? (
                    <span className="text-xs text-[var(--sf-text-tertiary)]">Saving...</span>
                  ) : (
                    <Badge variant={isEnabled ? "success" : "default"} size="sm" dot>
                      {isEnabled ? "On" : "Off"}
                    </Badge>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
