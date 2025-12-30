import React, { useState, useRef, useEffect } from 'react';

interface DemoAlert {
    id: string;
    campaignName: string;
    type: 'daily_budget_over' | 'daily_budget_under' | 'progress_mismatch_over' | 'progress_mismatch_under' | 'campaign_ending' | 'budget_almost_exhausted' | 'budget_not_set';
    severity: 'high' | 'medium' | 'low';
    message: string;
    isRead: boolean;
    createdAt: string;
}

const INITIAL_DEMO_ALERTS: DemoAlert[] = [
    {
        id: '1',
        campaignName: 'TechCorp Search_JP',
        type: 'budget_almost_exhausted',
        severity: 'high',
        message: 'Remaining budget is less than 5%. Increase budget or campaign will pause in 4 hours.',
        isRead: false,
        createdAt: new Date().toISOString()
    },
    {
        id: '2',
        campaignName: 'FashionBrand_IG_Spring',
        type: 'daily_budget_over',
        severity: 'medium',
        message: 'Daily spend is 25% higher than average. Pacing for early exhaustion.',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
        id: '3',
        campaignName: 'FoodDelivery_Meta_Retargeting',
        type: 'campaign_ending',
        severity: 'low',
        message: 'Campaign ends in 48 hours. Review performance for renewal.',
        isRead: false,
        createdAt: new Date(Date.now() - 7200000).toISOString()
    }
];

export const DemoAlertBadge: React.FC = () => {
    const [alerts, setAlerts] = useState<DemoAlert[]>(INITIAL_DEMO_ALERTS);
    const [isOpen, setIsOpen] = useState(false);
    const unreadCount = alerts.filter(a => !a.isRead).length;
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const markAsRead = (id: string) => {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
    };

    const deleteAlert = (id: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    };

    const getSeverityLabel = (severity: string) => {
        switch (severity) {
            case 'high': return '[CRITICAL]';
            case 'medium': return '[WARNING]';
            case 'low': return '[INFO]';
            default: return '[INFO]';
        }
    };

    const getTypeLabel = (type: DemoAlert['type']) => {
        switch (type) {
            case 'daily_budget_over': return 'BUDGET_OVER';
            case 'daily_budget_under': return 'BUDGET_UNDER';
            case 'progress_mismatch_over': return 'PACE_FAST';
            case 'progress_mismatch_under': return 'PACE_SLOW';
            case 'campaign_ending': return 'ENDING_SOON';
            case 'budget_almost_exhausted': return 'EXHAUSTED';
            case 'budget_not_set': return 'NO_BUDGET';
            default: return 'ALERT';
        }
    };

    return (
        <div className="relative font-mono" ref={popoverRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`group relative p-2 transition-all duration-200 hover:bg-black/5 active:scale-95 ${isOpen ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white border border-black/10 hover:border-black'
                    }`}
                aria-label="Notifications"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-12' : 'group-hover:rotate-12'}`}
                >
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {unreadCount > 0 && (
                    <span className={`absolute -top-1 -right-1 text-[9px] font-black border flex items-center justify-center h-4 min-w-[16px] px-1 transition-colors ${isOpen ? 'bg-white text-black border-black/20' : 'bg-black text-white border-white'
                        }`}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-50 max-h-[500px] overflow-y-auto">
                    <div className="border-b-2 border-black p-3 bg-black text-white flex justify-between items-center sticky top-0">
                        <h3 className="font-bold uppercase text-[10px] tracking-wider">Demo Alerts ({alerts.length})</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white hover:text-gray-300 font-bold uppercase text-[10px]"
                        >
                            [CLOSE]
                        </button>
                    </div>

                    <div className="divide-y divide-black/10">
                        {alerts.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-[10px] uppercase">
                                No active alerts
                            </div>
                        ) : (
                            alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className={`p-4 ${!alert.isRead ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100 transition-colors group relative`}
                                >
                                    {!alert.isRead && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-black"></div>
                                    )}

                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col">
                                                <span className={`text-[9px] font-bold ${alert.severity === 'high' ? 'text-red-600' : 'text-gray-500'}`}>
                                                    {getSeverityLabel(alert.severity)}
                                                </span>
                                                <span className="text-[10px] font-bold uppercase tracking-tight">
                                                    {getTypeLabel(alert.type)}
                                                </span>
                                            </div>
                                            <div className="text-[9px] text-gray-400">
                                                DEMO
                                            </div>
                                        </div>

                                        <div className="text-[11px] text-gray-800 leading-relaxed break-words">
                                            <span className="font-bold underline decoration-1 underline-offset-2 block mb-0.5">
                                                {alert.campaignName}
                                            </span>
                                            {alert.message}
                                        </div>

                                        <div className="flex justify-end gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!alert.isRead && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); markAsRead(alert.id); }}
                                                    className="text-[9px] px-2 py-1 bg-black text-white hover:bg-gray-800 border border-black uppercase font-bold"
                                                >
                                                    Mark Read
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteAlert(alert.id); }}
                                                className="text-[9px] px-2 py-1 bg-white text-black hover:bg-red-50 border border-black uppercase font-bold"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
