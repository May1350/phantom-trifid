import React from 'react';
import { Button } from '../../../shared/ui';

interface ConnectedAccount {
    email?: string;
    name?: string;
}

interface IntegrationCardProps {
    platformName: string;
    isConnected: boolean;
    accounts: ConnectedAccount[];
    onConnect: () => void;
    onDisconnect: (email?: string) => void;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
    platformName,
    isConnected,
    accounts,
    onConnect,
    onDisconnect
}) => {
    return (
        <div className="border border-black p-6">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-black border-dashed">
                <div className="flex flex-col">
                    <h3 className="font-bold uppercase text-lg">{platformName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 ${isConnected ? 'bg-accent' : 'bg-gray-300'}`}></div>
                        <span className="text-xs font-mono uppercase text-gray-500">
                            {isConnected ? `${accounts.length} ACCOUNT(S) CONNECTED` : 'DISCONNECTED'}
                        </span>
                    </div>
                </div>

                <Button variant={isConnected ? "outline" : "primary"} onClick={onConnect}>
                    {isConnected ? 'ADD ANOTHER ACCOUNT' : 'CONNECT'}
                </Button>
            </div>

            {isConnected && (
                <div className="grid gap-3">
                    {accounts.map((acc, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 border border-black/10">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold">{acc.name || 'Unknown'}</span>
                                <span className="text-xs font-mono text-gray-500">{acc.email || 'No Email'}</span>
                            </div>
                            <button
                                onClick={() => onDisconnect(acc.email)}
                                className="text-[10px] font-mono uppercase text-red-600 hover:underline"
                            >
                                [ DISCONNECT ]
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
