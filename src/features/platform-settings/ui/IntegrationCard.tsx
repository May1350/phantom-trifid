import React, { useState } from 'react';
import { Button } from '../../../shared/ui';
import { GoogleSignInButton } from '../../../shared/ui/GoogleSignInButton';

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
    const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null);

    const handleDisconnectClick = (email?: string) => {
        setConfirmDisconnect(email || '');
    };

    const handleConfirmDisconnect = () => {
        if (confirmDisconnect !== null) {
            onDisconnect(confirmDisconnect);
            setConfirmDisconnect(null);
        }
    };

    const handleCancelDisconnect = () => {
        setConfirmDisconnect(null);
    };

    return (
        <>
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

                    {platformName === 'Google Ads' ? (
                        <GoogleSignInButton
                            onClick={onConnect}
                            label={isConnected ? 'ADD ACCOUNT' : 'CONNECT'}
                            className="!py-2 !px-4 !shadow-none !border !border-black !rounded-none font-bold uppercase text-xs"
                        />
                    ) : (
                        <Button variant={isConnected ? "outline" : "primary"} onClick={onConnect}>
                            {isConnected ? 'ADD ANOTHER' : 'CONNECT'}
                        </Button>
                    )}
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
                                    onClick={() => handleDisconnectClick(acc.email)}
                                    className="text-[10px] font-mono uppercase text-red-600 hover:underline"
                                >
                                    [ DISCONNECT ]
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {confirmDisconnect !== null && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full">
                        <h3 className="text-xl font-black uppercase mb-4">Confirm Disconnect</h3>
                        <p className="text-sm mb-6 font-mono">
                            Are you sure you want to disconnect this account?
                            <br />
                            <span className="font-bold text-red-600">{confirmDisconnect || 'This account'}</span>
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={handleCancelDisconnect}
                                className="px-4 py-2 border border-black font-mono text-xs uppercase hover:bg-gray-100 transition-colors"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={handleConfirmDisconnect}
                                className="px-4 py-2 bg-red-600 text-white font-mono text-xs uppercase hover:bg-red-700 transition-colors border border-red-600"
                            >
                                DISCONNECT
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
