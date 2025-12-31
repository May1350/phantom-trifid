import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface Alert {
    id: string;
    accountId: string;
    campaignId: string;
    campaignName: string;
    type: 'daily_budget_over' | 'daily_budget_under' | 'progress_mismatch_over' | 'progress_mismatch_under' | 'campaign_ending' | 'budget_almost_exhausted' | 'budget_not_set';
    severity: 'high' | 'medium' | 'low';
    message: string;
    metadata: {
        dailyBudget?: number;
        yesterdaySpend?: number;
        periodProgress?: number;
        budgetProgress?: number;
        daysLeft?: number;
        spendRate?: number;
    };
    isRead: boolean;
    createdAt: string;
}

export const AlertBadge: React.FC = () => {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const popoverRef = useRef<HTMLDivElement>(null);

    // 알람 목록 조회
    const fetchAlerts = async () => {
        try {
            const res = await fetch('/api/alerts', {
                credentials: 'include'
            });

            if (!res.ok) {
                console.warn('Alerts API returned status:', res.status);
                setAlerts([]);
                setUnreadCount(0);
                return;
            }

            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.warn('Alerts API returned non-JSON content:', contentType);
                setAlerts([]);
                setUnreadCount(0);
                return;
            }

            const data = await res.json();
            if (Array.isArray(data)) {
                setAlerts(data);
                setUnreadCount(data.filter((a: Alert) => !a.isRead).length);
            } else {
                setAlerts([]);
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
            setAlerts([]);
            setUnreadCount(0);
        }
    };

    // 초기 로드 및 주기적 업데이트 (30초마다)
    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 30000);
        return () => clearInterval(interval);
    }, []);

    // 팝오버 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // 알람 읽음 처리
    const markAsRead = async (id: string) => {
        try {
            await fetch(`/api/alerts/${id}/read`, {
                method: 'POST',
                credentials: 'include'
            });
            fetchAlerts();
        } catch (error) {
            console.error('Failed to mark alert as read:', error);
        }
    };

    // 알람 삭제
    const deleteAlert = async (id: string) => {
        try {
            await fetch(`/api/alerts/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            fetchAlerts();
        } catch (error) {
            console.error('Failed to delete alert:', error);
        }
    };

    // Severity별 라벨 (Text based)
    const getSeverityLabel = (severity: string) => {
        switch (severity) {
            case 'high': return '[CRITICAL]';
            case 'medium': return '[WARNING]';
            case 'low': return '[INFO]';
            default: return '[INFO]';
        }
    };

    // Type별 라벨 (Text based)
    const getTypeLabel = (type: Alert['type']) => {
        switch (type) {
            case 'daily_budget_over': return 'BUDGET_OVERF';
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
            {/* 알람 뱃지 버튼 */}
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

            {/* 알람 목록 팝오버 */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-50 max-h-[500px] overflow-y-auto">
                    <div className="border-b-2 border-black p-3 bg-black text-white flex justify-between items-center sticky top-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold uppercase text-xs tracking-wider">System Alerts ({alerts.length})</h3>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate('/settings');
                                }}
                                className="p-1 hover:bg-white/20 transition-colors"
                                title="Alert Settings"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.72V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                            </button>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white hover:text-gray-300 font-bold uppercase text-xs"
                        >
                            [CLOSE]
                        </button>
                    </div>

                    <div className="divide-y divide-black/10">
                        {alerts.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-xs uppercase">
                                No active alerts
                            </div>
                        ) : (
                            alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className={`p-4 ${!alert.isRead ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100 transition-colors group relative`}
                                >
                                    {/* Status Indicator Bar */}
                                    {!alert.isRead && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-black"></div>
                                    )}

                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col">
                                                <span className={`text-[10px] font-bold ${alert.severity === 'high' ? 'text-red-600' : 'text-gray-500'}`}>
                                                    {getSeverityLabel(alert.severity)}
                                                </span>
                                                <span className="text-xs font-bold uppercase tracking-tight">
                                                    {getTypeLabel(alert.type)}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-gray-400">
                                                {new Date(alert.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div className="text-xs text-gray-800 leading-relaxed break-words">
                                            <span className="font-bold underline decoration-1 underline-offset-2 block mb-1">
                                                {alert.campaignName}
                                            </span>
                                            {alert.message}
                                        </div>

                                        <div className="flex justify-end gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!alert.isRead && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); markAsRead(alert.id); }}
                                                    className="text-[10px] px-2 py-1 bg-black text-white hover:bg-gray-800 border border-black uppercase"
                                                >
                                                    Mark Read
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteAlert(alert.id); }}
                                                className="text-[10px] px-2 py-1 bg-white text-black hover:bg-red-50 border border-black uppercase"
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
