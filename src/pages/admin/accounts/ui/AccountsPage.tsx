import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Account {
    id: string;
    name: string;
    type: 'admin' | 'agency';
    email: string;
    createdAt: string;
}

interface AccountStats {
    clientCount: number;
    connectedProviders: {
        google: boolean;
        meta: boolean;
    };
}

export const AdminAccountsPage: React.FC = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [stats, setStats] = useState<Record<string, AccountStats>>({});

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const response = await axios.get('http://localhost:3001/api/accounts', {
                withCredentials: true
            });
            setAccounts(response.data);

            // 각 계정의 통계 가져오기
            for (const account of response.data) {
                fetchAccountStats(account.id);
            }
        } catch (error) {
            console.error('Failed to fetch accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAccountStats = async (accountId: string) => {
        try {
            const response = await axios.get(`http://localhost:3001/api/accounts/${accountId}/stats`, {
                withCredentials: true
            });
            setStats(prev => ({ ...prev, [accountId]: response.data.stats }));
        } catch (error) {
            console.error(`Failed to fetch stats for ${accountId}:`, error);
        }
    };

    const handleDelete = async (accountId: string) => {
        if (accountId === 'admin') {
            alert('ADMIN ACCOUNT CANNOT BE DELETED');
            return;
        }

        if (!confirm(`DELETE ACCOUNT ${accountId}?`)) {
            return;
        }

        try {
            await axios.delete(`http://localhost:3001/api/accounts/${accountId}`, {
                withCredentials: true
            });
            fetchAccounts();
        } catch (error: any) {
            alert(error.response?.data?.error || 'DELETE FAILED');
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <p className="font-mono text-sm">LOADING ACCOUNTS...</p>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black uppercase">Account Management</h1>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 border border-black font-mono text-sm uppercase hover:bg-black hover:text-white transition"
                >
                    + New Account
                </button>
            </div>

            <div className="border border-black">
                <table className="w-full font-mono text-sm">
                    <thead>
                        <tr className="border-b border-black bg-gray-50">
                            <th className="text-left p-3 uppercase font-black">ID</th>
                            <th className="text-left p-3 uppercase font-black">Name</th>
                            <th className="text-left p-3 uppercase font-black">Type</th>
                            <th className="text-left p-3 uppercase font-black">Email</th>
                            <th className="text-left p-3 uppercase font-black">Clients</th>
                            <th className="text-left p-3 uppercase font-black">Connected</th>
                            <th className="text-left p-3 uppercase font-black">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {accounts.map(account => {
                            const accountStats = stats[account.id];
                            return (
                                <tr key={account.id} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="p-3">{account.id}</td>
                                    <td className="p-3 font-semibold">{account.name}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs ${account.type === 'admin' ? 'bg-black text-white' : 'border border-black'}`}>
                                            {account.type.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-3">{account.email}</td>
                                    <td className="p-3">{accountStats?.clientCount ?? '-'}</td>
                                    <td className="p-3">
                                        {accountStats?.connectedProviders.google && <span className="mr-2">🔗 Google</span>}
                                        {accountStats?.connectedProviders.meta && <span>🔗 Meta</span>}
                                        {!accountStats?.connectedProviders.google && !accountStats?.connectedProviders.meta && '-'}
                                    </td>
                                    <td className="p-3">
                                        <button
                                            onClick={() => handleDelete(account.id)}
                                            className="text-xs uppercase hover:underline"
                                            disabled={account.id === 'admin'}
                                        >
                                            {account.id === 'admin' ? '-' : 'Delete'}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {showCreateModal && (
                <CreateAccountModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        fetchAccounts();
                    }}
                />
            )}
        </div>
    );
};

// Create Account Modal Component
interface CreateAccountModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const CreateAccountModal: React.FC<CreateAccountModalProps> = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        type: 'agency' as 'admin' | 'agency',
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await axios.post('http://localhost:3001/api/accounts', formData, {
                withCredentials: true
            });
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.error || 'FAILED TO CREATE ACCOUNT');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-black p-8 w-full max-w-md">
                <h2 className="text-xl font-black uppercase mb-6">Create New Account</h2>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block font-mono text-xs uppercase mb-1">Account ID</label>
                        <input
                            type="text"
                            value={formData.id}
                            onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                            className="w-full border border-black p-2 font-mono text-sm"
                            placeholder="agency_001"
                            required
                        />
                    </div>

                    <div>
                        <label className="block font-mono text-xs uppercase mb-1">Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full border border-black p-2 font-mono text-sm"
                            placeholder="Agency Name"
                            required
                        />
                    </div>

                    <div>
                        <label className="block font-mono text-xs uppercase mb-1">Type</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'admin' | 'agency' })}
                            className="w-full border border-black p-2 font-mono text-sm"
                        >
                            <option value="agency">Agency</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <div>
                        <label className="block font-mono text-xs uppercase mb-1">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full border border-black p-2 font-mono text-sm"
                            placeholder="user@agency.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block font-mono text-xs uppercase mb-1">Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full border border-black p-2 font-mono text-sm"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-2 bg-red-100 border border-red-500 text-red-700 text-xs font-mono">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-2 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-black font-mono text-sm uppercase hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-black text-white font-mono text-sm uppercase hover:bg-gray-800 disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
