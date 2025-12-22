import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../../shared/ui';
import { storage } from '../../../shared/lib/storage';

export const MockOAuthPage: React.FC = () => {
    const { provider } = useParams<{ provider: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectUri = searchParams.get('redirect_uri') || '/dashboard';
    const [isProcessing, setIsProcessing] = useState(false);

    const providerName = provider === 'google' ? 'Google Ads' : 'Meta Ads';

    const handleApprove = () => {
        setIsProcessing(true);
        setTimeout(() => {
            // Simulate receiving a token and saving it
            const mockToken = `mock_${provider}_token_${Date.now()}`;
            storage.set(`${provider}_api_key`, mockToken);
            navigate(redirectUri);
        }, 1500);
    };

    const handleDeny = () => {
        navigate(redirectUri);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md bg-white border border-black p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black uppercase mb-2">Authorize Access</h1>
                    <p className="font-mono text-sm text-gray-500">
                        {providerName} requests permission to access your ad account data.
                    </p>
                </div>

                <div className="border-t border-b border-black py-4 mb-8">
                    <ul className="list-disc list-inside font-mono text-xs space-y-2">
                        <li>View campaigns and ad groups</li>
                        <li>View performance metrics (Cost, clicks, impressions)</li>
                        <li>Manage budget settings</li>
                    </ul>
                </div>

                <div className="flex gap-4">
                    <Button variant="outline" fullWidth onClick={handleDeny} disabled={isProcessing}>
                        DENY
                    </Button>
                    <Button fullWidth onClick={handleApprove} disabled={isProcessing}>
                        {isProcessing ? 'CONNECTING...' : 'APPROVE'}
                    </Button>
                </div>

                <div className="mt-4 text-center">
                    <p className="text-[10px] text-gray-400 font-mono uppercase">
                        This is a simulated OAuth screen.
                    </p>
                </div>
            </div>
        </div>
    );
};
