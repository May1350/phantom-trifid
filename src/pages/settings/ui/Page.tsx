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
            const data = await res.json();
            setConnections({
                google: data.google,
                meta: data.meta
            });
        } catch (e) {
            console.error('Failed to fetch status', e);
        }
    };

    const handleConnect = (platform: 'google' | 'meta') => {
        window.location.href = `/api/auth/${platform}`;
    };

    const handleDisconnect = async (platform: 'google' | 'meta', email?: string) => {
        const confirmMsg = email
            ? `Disconnect ${email} from ${platform}?`
            : `Disconnect all ${platform} accounts?`;

        if (confirm(confirmMsg)) {
            await fetch(`/api/auth/disconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform, email })
            });
            fetchStatus();
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
