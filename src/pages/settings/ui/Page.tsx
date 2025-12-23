import React, { useState, useEffect } from 'react';
import { IntegrationCard } from '../../../features/platform-settings/ui/IntegrationCard';

interface ConnectedAccount {
    email: string;
    name: string;
}

interface PlatformOverview {
    connected: boolean;
    accounts: ConnectedAccount[];
}

interface PlatformState {
    google: PlatformOverview;
    meta: PlatformOverview;
}

const initialState: PlatformState = {
    google: { connected: false, accounts: [] },
    meta: { connected: false, accounts: [] }
};

export const SettingsPage: React.FC = () => {
    const [connections, setConnections] = useState<PlatformState>(initialState);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/auth/status');

            if (res.status === 401) {
                // Redirect to login if unauthorized
                window.location.href = '/login';
                return;
            }

            if (!res.ok) {
                throw new Error(`Failed to fetch status: ${res.status}`);
            }

            const data = await res.json();
            setConnections({
                google: data.google || { connected: false, accounts: [] },
                meta: data.meta || { connected: false, accounts: [] }
            });
        } catch (e) {
            console.error('Failed to fetch status', e);
            // Don't crash, update state with safe defaults if needed, or keep initial state
        }
    };

    const handleConnect = (platform: 'google' | 'meta') => {
        window.location.href = `/api/auth/${platform}`;
    };

    const handleDisconnect = async (platform: 'google' | 'meta', email?: string) => {
        try {
            const res = await fetch(`/api/auth/disconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform, email })
            });

            if (res.ok) {
                // Refresh status after successful disconnect
                await fetchStatus();
            } else {
                console.error('Failed to disconnect:', await res.text());
            }
        } catch (error) {
            console.error('Error disconnecting account:', error);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-black uppercase tracking-tighter mb-8 border-b-4 border-black pb-2">
                Platform Connections
            </h1>

            <div className="grid gap-6">
                <IntegrationCard
                    platformName="Google Ads"
                    isConnected={connections.google.connected}
                    accounts={connections.google.accounts}
                    onConnect={() => handleConnect('google')}
                    onDisconnect={(email) => handleDisconnect('google', email)}
                />

                <IntegrationCard
                    platformName="Meta Ads (Facebook)"
                    isConnected={connections.meta.connected}
                    accounts={connections.meta.accounts}
                    onConnect={() => handleConnect('meta')}
                    onDisconnect={(email) => handleDisconnect('meta', email)}
                />
            </div>
        </div>
    );
};
