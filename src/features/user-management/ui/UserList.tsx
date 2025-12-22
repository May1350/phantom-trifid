import React, { useEffect, useState } from 'react';

interface Account {
    id: string;
    name: string;
    email: string;
    type: 'admin' | 'agency';
    status: 'active' | 'pending' | 'suspended';
    provider: 'email' | 'google';
    createdAt: string;
}

export const UserList: React.FC = () => {
    const [users, setUsers] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/accounts', {
                credentials: 'include'
            });
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleStatusChange = async (userId: string, newStatus: string) => {
        try {
            await fetch(`/api/accounts/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
                credentials: 'include'
            });
            fetchUsers();
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

        try {
            await fetch(`/api/accounts/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            fetchUsers();
        } catch (error) {
            console.error('Failed to delete user:', error);
        }
    };

    if (loading) return <div className="p-4 font-mono text-xs">LOADING USERS...</div>;

    return (
        <div className="bg-white border border-black p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold uppercase">Registered Users</h2>
                <button
                    onClick={fetchUsers}
                    className="text-xs border border-black px-2 py-1 hover:bg-gray-100"
                >
                    REFRESH
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-black text-xs font-mono uppercase bg-gray-50">
                            <th className="p-3">Name</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Provider</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Joined</th>
                            <th className="p-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm font-mono">
                        {users.map(user => (
                            <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="p-3 font-bold">{user.name}</td>
                                <td className="p-3 text-gray-600">{user.email}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-0.5 text-xs border ${user.type === 'admin' ? 'bg-black text-white border-black' : 'bg-white text-black border-black'
                                        }`}>
                                        {user.type}
                                    </span>
                                </td>
                                <td className="p-3 capitalize">{user.provider || 'email'}</td>
                                <td className="p-3">
                                    <select
                                        value={user.status || 'active'}
                                        onChange={(e) => handleStatusChange(user.id, e.target.value)}
                                        disabled={user.type === 'admin'}
                                        className={`text-xs p-1 border outline-none cursor-pointer ${user.status === 'pending' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' :
                                                user.status === 'suspended' ? 'bg-red-100 border-red-300 text-red-800' :
                                                    'bg-green-100 border-green-300 text-green-800'
                                            }`}
                                    >
                                        <option value="active">Active</option>
                                        <option value="pending">Pending</option>
                                        <option value="suspended">Suspended</option>
                                    </select>
                                </td>
                                <td className="p-3 text-gray-500 text-xs">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td className="p-3 text-right">
                                    {user.type !== 'admin' && (
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="text-red-500 hover:text-red-700 hover:underline text-xs"
                                        >
                                            DELETE
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
