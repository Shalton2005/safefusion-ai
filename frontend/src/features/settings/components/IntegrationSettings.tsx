import { useState, useEffect } from 'react';
import { Card, CardHeader, Button } from '@/components/ui';
import { userService, type UserIntegrationsResponse } from '@/services';
import { toast } from '@/store/useNotificationStore';
import { ApiError } from '@/api/errors';

export function IntegrationSettings() {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<UserIntegrationsResponse | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIntegrations() {
      try {
        const data = await userService.getIntegrations();
        setIntegrations(data);
      } catch (err) {
        toast.error('Failed to load integrations', ApiError.from(err).toUserMessage());
      } finally {
        setLoading(false);
      }
    }
    fetchIntegrations();
  }, []);

  const handleAction = async (integrationKey: string, actionName: string) => {
    setActionLoading(integrationKey);
    // Simulate API call for the action (reconnect, regenerate)
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success(`${actionName} Successful`, `${integrationKey} has been processed.`);
    setActionLoading(null);
  };

  return (
    <Card>
      <CardHeader title="Integrations" description="Connect third-party systems and manage API keys" />
      <div className="mt-2 space-y-3 p-4 pt-0">
        {loading ? (
          <div className="text-sm text-[var(--sf-text-secondary)]">Loading integrations...</div>
        ) : !integrations ? (
           <div className="text-sm text-red-500">Could not load integrations data.</div>
        ) : (
          <>
            <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--sf-border-default)]">
              <div>
                <span className="text-sm font-medium text-[var(--sf-text-primary)]">REST API Key</span>
                <p className="text-xs text-[var(--sf-text-tertiary)]">Status: {integrations.rest_api}</p>
                <p className="text-xs text-[var(--sf-text-tertiary)]">Last Sync: {integrations.last_sync}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleAction('REST API Key', 'Regenerate')}
                disabled={actionLoading === 'REST API Key'}
              >
                {actionLoading === 'REST API Key' ? 'Processing...' : 'Regenerate Key'}
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--sf-border-default)]">
              <div>
                <span className="text-sm font-medium text-[var(--sf-text-primary)]">WebSocket Connection</span>
                <p className="text-xs text-[var(--sf-text-tertiary)]">Status: {integrations.websocket}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleAction('WebSocket Connection', 'Reconnect')}
                disabled={actionLoading === 'WebSocket Connection'}
              >
                 {actionLoading === 'WebSocket Connection' ? 'Connecting...' : 'Reconnect'}
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--sf-border-default)]">
              <div>
                <span className="text-sm font-medium text-[var(--sf-text-primary)]">SMTP Configuration</span>
                <p className="text-xs text-[var(--sf-text-tertiary)]">Status: {integrations.smtp}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleAction('SMTP Configuration', 'Configure')}
                disabled={actionLoading === 'SMTP Configuration'}
              >
                Configure
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
