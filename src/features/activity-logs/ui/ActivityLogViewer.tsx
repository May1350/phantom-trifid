
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '../../../shared/ui';

interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    type: string;
    accountId?: string;
    [key: string]: any;
}

export const ActivityLogViewer: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    // Default to today in YYYY-MM-DD format
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [error, setError] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.get('/api/admin/logs', {
                params: { date },
                withCredentials: true // Important for session cookie
            });
            setLogs(response.data.logs || []);
        } catch (err) {
            console.error('Failed to fetch logs', err);
            setError('Failed to load logs. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [date]);

    const [showErrorsOnly, setShowErrorsOnly] = useState(false);

    const logsToDisplay = showErrorsOnly
        ? logs.filter(log => log.level === 'error')
        : logs;

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between bg-gray-50 p-4 border border-black">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <label className="font-mono text-sm font-bold uppercase">Date:</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="border border-gray-300 px-2 py-1 font-mono text-sm"
                        />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={showErrorsOnly}
                            onChange={e => setShowErrorsOnly(e.target.checked)}
                            className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <span className={`font-mono text-sm uppercase font-bold ${showErrorsOnly ? 'text-red-600' : 'text-gray-500'}`}>
                            Show Errors Only
                        </span>
                    </label>
                </div>
                <Button onClick={fetchLogs} disabled={loading} variant="outline" size="sm">
                    {loading ? 'LOADING...' : 'REFRESH LOGS'}
                </Button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 text-red-600 p-3 text-sm font-mono border border-red-200">
                    ⚠ {error}
                </div>
            )}

            {/* Log Table */}
            <div className="border border-black overflow-x-auto">
                <table className="w-full text-sm font-mono">
                    <thead className="bg-black text-white uppercase">
                        <tr>
                            <th className="px-4 py-2 text-left">Time</th>
                            <th className="px-4 py-2 text-left">Level</th>
                            <th className="px-4 py-2 text-left">Account</th>
                            <th className="px-4 py-2 text-left">Action</th>
                            <th className="px-4 py-2 text-left">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {logsToDisplay.length === 0 && !loading ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">
                                    {showErrorsOnly ? 'No error logs found.' : 'No activity logs found for this date.'}
                                </td>
                            </tr>
                        ) : (
                            logsToDisplay.map((log, index) => (
                                <tr key={index} className={`hover:bg-gray-50 transition-colors ${log.level === 'error' ? 'bg-red-50 border-l-4 border-red-500' : 'border-l-4 border-transparent'
                                    }`}>
                                    <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                                        {log.timestamp.split(' ')[1]}
                                    </td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-0.5 text-xs font-bold rounded ${log.level === 'error' ? 'bg-red-100 text-red-800' :
                                            log.level === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-blue-50 text-blue-800'
                                            }`}>
                                            {log.level.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 font-bold">
                                        {log.accountId || '-'}
                                    </td>
                                    <td className="px-4 py-2">
                                        {log.message}
                                    </td>
                                    <td className="px-4 py-2 text-gray-500 max-w-xs truncate" title={JSON.stringify(log, null, 2)}>
                                        {/* Display specific details if available, else raw JSON */}
                                        {JSON.stringify({ ...log, timestamp: undefined, level: undefined, message: undefined, type: undefined, accountId: undefined })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <div className="text-right text-xs text-gray-400 font-mono">
                Total Records: {logs.length}
            </div>
        </div>
    );
};
