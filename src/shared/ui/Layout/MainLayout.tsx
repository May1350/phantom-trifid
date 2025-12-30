import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { storage } from '../../../shared/lib/storage';
import { AlertBadge } from '../../../features/alerts/ui/AlertBadge';

interface MainLayoutProps {
    children: React.ReactNode;
    userRole: 'admin' | 'agency';
    onLogout: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
    children,
    userRole,
    onLogout,
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentPage = location.pathname.substring(1); // Remove leading slash

    // Extract email from storage
    const accountInfo = storage.get<any>('account_info', null);
    let userEmail = '';

    if (accountInfo) {
        // Handle both object and double-stringified string (for backward compatibility during migration)
        const info = typeof accountInfo === 'string' ? JSON.parse(accountInfo) : accountInfo;
        userEmail = info?.email || '';
    }

    const menuItems = userRole === 'admin'
        ? [
            { id: 'admin', label: 'SYSTEM_LOGS' },
            { id: 'users', label: 'USER_MGMT' }
        ]
        : [
            { id: 'dashboard', label: 'OVERVIEW' },
            { id: 'campaigns', label: 'CAMPAIGNS' },
            { id: 'settings', label: 'CONNECTIONS' }
        ];

    const handleNavigate = (page: string) => {
        navigate(`/${page}`);
    };

    return (
        <div className="flex h-screen w-full bg-white overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 border-r border-black flex flex-col h-full">
                <div className="p-6 border-b border-black">
                    <h1 className="font-black text-xl uppercase tracking-tighter">A</h1>
                    <div className="text-[10px] font-mono mt-1 text-gray-500 truncate" title={userEmail || (userRole === 'admin' ? 'ADMIN_CONSOLE' : 'AGENCY_VIEW')}>
                        {userEmail || (userRole === 'admin' ? 'ADMIN_CONSOLE' : 'AGENCY_VIEW')}
                    </div>
                </div>

                <nav className="flex-1 p-6 flex flex-col gap-2 overflow-y-auto">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => handleNavigate(item.id)}
                            className={`text-left font-mono text-sm uppercase py-1 px-2 border-l-2 transition-colors ${currentPage === item.id
                                ? 'border-accent text-black font-bold'
                                : 'border-transparent text-gray-500 hover:text-black hover:border-gray-300'
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-6 border-t border-black">
                    <button
                        onClick={onLogout}
                        className="w-full text-left font-mono text-xs uppercase text-red-600 hover:underline"
                    >
                        [ LOGOUT ]
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 h-full overflow-y-auto bg-gray-50 flex flex-col">
                {/* Top Bar with Alert Badge */}
                {userRole === 'agency' && (
                    <div className="bg-white border-b border-black p-4 flex justify-end flex-shrink-0">
                        <AlertBadge />
                    </div>
                )}

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};
