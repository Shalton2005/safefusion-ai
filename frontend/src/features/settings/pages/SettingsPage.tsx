import { useState } from 'react';
import { User, Bell, Shield, Palette, Database, ChevronRight } from 'lucide-react';
import { Card, CardHeader, Button, Input, Badge, PageHeader } from '@/components/ui';
import { useThemeStore } from '@/store';
import { cn } from '@/lib/cn';
import type { Theme } from '@/types';
import { APP_VERSION } from '@/constants';

type SettingsSection = 'profile' | 'notifications' | 'security' | 'appearance' | 'integrations';

const SECTIONS: { id: SettingsSection; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'profile',       label: 'Profile',       icon: User,     description: 'Manage your personal information' },
  { id: 'notifications', label: 'Notifications', icon: Bell,     description: 'Configure alert preferences' },
  { id: 'security',      label: 'Security',      icon: Shield,   description: 'Password and access settings' },
  { id: 'appearance',    label: 'Appearance',    icon: Palette,  description: 'Theme and display options' },
  { id: 'integrations',  label: 'Integrations',  icon: Database, description: 'API keys and third-party connections' },
];

const THEME_OPTIONS: { value: Theme; label: string; description: string }[] = [
  { value: 'light',  label: 'Light',  description: 'White background, high contrast' },
  { value: 'dark',   label: 'Dark',   description: 'Dark background, easy on the eyes' },
  { value: 'system', label: 'System', description: 'Follow system preference' },
];

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="page-container">
      <PageHeader
        title="Settings"
        description="Manage your account, preferences, and platform configuration."
        border={false}
        className="px-0 pt-0"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar nav */}
        <Card padding="sm" className="lg:col-span-1 h-fit">
          <nav className="space-y-1">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm',
                    'transition-colors duration-150',
                    activeSection === s.id
                      ? 'bg-primary-600/15 text-primary-400'
                      : 'text-[var(--sf-text-secondary)] hover:bg-[var(--sf-surface-raised)] hover:text-[var(--sf-text-primary)]',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {s.label}
                  </div>
                  <ChevronRight className="w-3 h-3 opacity-50" />
                </button>
              );
            })}
          </nav>
        </Card>

        {/* Content panel */}
        <div className="lg:col-span-3 space-y-4">
          {activeSection === 'profile' && (
            <Card>
              <CardHeader title="Profile" description="Update your personal details" />
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="First Name" placeholder="John" fullWidth />
                  <Input label="Last Name"  placeholder="Doe"  fullWidth />
                </div>
                <Input label="Email" type="email" placeholder="john.doe@company.com" fullWidth />
                <Input label="Job Title" placeholder="Safety Engineer" fullWidth />
                <div className="flex justify-end">
                  <Button>Save Changes</Button>
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'notifications' && (
            <Card>
              <CardHeader title="Notifications" description="Choose which alerts you receive" />
              <div className="space-y-3 mt-2">
                {[
                  { label: 'Critical Alerts',      description: 'Immediate notifications for critical safety events' },
                  { label: 'High Severity Alerts',  description: 'Alerts for high severity incidents' },
                  { label: 'Daily Summary',         description: 'End-of-day digest of all activities' },
                  { label: 'System Maintenance',    description: 'Planned downtime and maintenance windows' },
                ].map((n) => (
                  <div key={n.label} className="flex items-center justify-between py-2 border-b border-[var(--sf-border-default)] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-[var(--sf-text-primary)]">{n.label}</p>
                      <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">{n.description}</p>
                    </div>
                    <Badge variant="success" size="sm" dot>On</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeSection === 'security' && (
            <Card>
              <CardHeader title="Security" description="Manage password and authentication" />
              <div className="space-y-4 mt-2">
                <Input label="Current Password" type="password" placeholder="••••••••" fullWidth />
                <Input label="New Password"     type="password" placeholder="••••••••" fullWidth />
                <Input label="Confirm Password" type="password" placeholder="••••••••" fullWidth />
                <div className="flex justify-end">
                  <Button>Update Password</Button>
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'appearance' && (
            <Card>
              <CardHeader title="Appearance" description="Customise the platform look and feel" />
              <div className="space-y-3 mt-4">
                <p className="text-sm font-medium text-[var(--sf-text-primary)]">Theme</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {THEME_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setTheme(opt.value)}
                      className={cn(
                        'flex flex-col items-start gap-1 p-4 rounded-lg border-2 text-left transition-colors',
                        theme === opt.value
                          ? 'border-primary-500 bg-primary-600/10'
                          : 'border-[var(--sf-border-default)] hover:border-[var(--sf-text-tertiary)]',
                      )}
                    >
                      <p className="text-sm font-semibold text-[var(--sf-text-primary)]">{opt.label}</p>
                      <p className="text-xs text-[var(--sf-text-tertiary)]">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'integrations' && (
            <Card>
              <CardHeader title="Integrations" description="Connect third-party systems and manage API keys" />
              <div className="mt-4 space-y-3">
                {['REST API Key', 'WebSocket Token', 'SMTP Config'].map((item) => (
                  <div key={item} className="flex items-center justify-between p-3 rounded-lg border border-[var(--sf-border-default)]">
                    <span className="text-sm text-[var(--sf-text-primary)]">{item}</span>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-center text-xs text-[var(--sf-text-tertiary)]">
        SafeFusion AI v{APP_VERSION}
      </div>
    </div>
  );
}
