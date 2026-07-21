import { useState } from 'react';
import { User, Bell, Shield, Palette, Database, ChevronRight } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';
import { cn } from '@/lib/cn';
import { APP_VERSION } from '@/constants';
import { ProfileSettings } from '../components/ProfileSettings';
import { NotificationSettings } from '../components/NotificationSettings';
import { SecuritySettings } from '../components/SecuritySettings';
import { AppearanceSettings } from '../components/AppearanceSettings';
import { IntegrationSettings } from '../components/IntegrationSettings';

type SettingsSection = 'profile' | 'notifications' | 'security' | 'appearance' | 'integrations';

const SECTIONS: { id: SettingsSection; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'profile',       label: 'Profile',       icon: User,     description: 'Manage your personal information' },
  { id: 'notifications', label: 'Notifications', icon: Bell,     description: 'Configure alert preferences' },
  { id: 'security',      label: 'Security',      icon: Shield,   description: 'Password and access settings' },
  { id: 'appearance',    label: 'Appearance',    icon: Palette,  description: 'Theme and display options' },
  { id: 'integrations',  label: 'Integrations',  icon: Database, description: 'API keys and third-party connections' },
];

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  return (
    <div className="page-container">
      <PageHeader
        title="Settings"
        description="Manage your account, preferences, and platform configuration."
        border={false}
        className="px-0 pt-0"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
        <div className="lg:col-span-3 space-y-4 max-w-4xl">
          {activeSection === 'profile' && <ProfileSettings />}
          {activeSection === 'notifications' && <NotificationSettings />}
          {activeSection === 'security' && <SecuritySettings />}
          {activeSection === 'appearance' && <AppearanceSettings />}
          {activeSection === 'integrations' && <IntegrationSettings />}
        </div>
      </div>

      <div className="mt-8 flex justify-center text-xs text-[var(--sf-text-tertiary)]">
        SafeFusion AI v{APP_VERSION}
      </div>
    </div>
  );
}
