import React, { useState } from 'react';
import { UserList } from '../../../features/user-management/ui/UserList';
import { ActivityLogViewer } from '../../../features/activity-logs/ui/ActivityLogViewer';

export const AdminPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'logs'>('overview');

    return (
        <div className="p-8">
            <h1 className="text-2xl font-black uppercase mb-6">Admin Console</h1>

            {/* Tabs */}
            <div className="border-b border-black mb-6">
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 font-mono text-sm uppercase ${activeTab === 'overview'
                            ? 'border-b-2 border-black font-bold'
                            : 'text-gray-500 hover:text-black'
                            }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('accounts')}
                        className={`px-4 py-2 font-mono text-sm uppercase ${activeTab === 'accounts'
                            ? 'border-b-2 border-black font-bold'
                            : 'text-gray-500 hover:text-black'
                            }`}
                    >
                        Users & Accounts
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`px-4 py-2 font-mono text-sm uppercase ${activeTab === 'logs'
                            ? 'border-b-2 border-black font-bold'
                            : 'text-gray-500 hover:text-black'
                            }`}
                    >
                        Activity Logs
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="border border-black p-4">
                    <p className="font-mono text-sm">System Status: ONLINE</p>
                </div>
            )}

            {activeTab === 'accounts' && <UserList />}
            {activeTab === 'logs' && <ActivityLogViewer />}
        </div>
    );
};
