import React, { useEffect, useState } from 'react';

interface Client {
    id: string;
    name: string;
    provider: 'google' | 'meta';
    commission?: {
        type: 'fixed' | 'percentage';
        value: number;
    };
}

interface ClientManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void; // Trigger refresh in parent
}

export const ClientManager: React.FC<ClientManagerProps> = ({ isOpen, onClose, onUpdate }) => {
    const [availableAccounts, setAvailableAccounts] = useState<Client[]>([]);
    const [myClients, setMyClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(false);

    // Commission editing state
    const [editingCommission, setEditingCommission] = useState<string | null>(null);
    const [commissionType, setCommissionType] = useState<'fixed' | 'percentage'>('fixed');
    const [commissionValue, setCommissionValue] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Set loading immediately for instant feedback
            setLoading(true);
            loadData();
            setSearchTerm('');
        }
    }, [isOpen]);

    const loadData = () => {
        const t = Date.now();
        Promise.all([
            fetch(`/api/data/connections?t=${t}`).then(res => res.json()), // All available
            fetch(`/api/data/clients?t=${t}`).then(res => res.json())      // My saved list
        ]).then(([connections, clients]) => {
            setAvailableAccounts(Array.isArray(connections) ? connections : []);
            setMyClients(Array.isArray(clients) ? clients : []);
            setLoading(false);
        }).catch(err => {
            console.error('Failed to load data', err);
            setAvailableAccounts([]);
            setMyClients([]);
            setLoading(false);
        });
    };

    const isAdded = (id: string) => myClients.some(c => c.id === id);

    const handleAdd = async (client: Client) => {
        try {
            await fetch('/api/data/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(client)
            });
            loadData();
            onUpdate();
        } catch (e) {
            console.error('Failed to add client', e);
        }
    };

    const handleRemove = async (id: string) => {
        try {
            await fetch(`/api/data/clients/${id}`, { method: 'DELETE' });
            loadData();
            onUpdate();
        } catch (e) {
            console.error('Failed to remove client', e);
        }
    };

    const handleEditCommission = (client: Client) => {
        setEditingCommission(client.id);
        if (client.commission) {
            setCommissionType(client.commission.type);
            setCommissionValue(client.commission.value.toString());
        } else {
            setCommissionType('fixed');
            setCommissionValue('');
        }
    };

    const handleSaveCommission = async (clientId: string) => {
        try {
            const value = parseFloat(commissionValue);
            if (isNaN(value) || value < 0) {
                alert('Please enter a valid amount/percentage');
                return;
            }

            if (commissionType === 'percentage' && value > 100) {
                alert('Percentage cannot exceed 100');
                return;
            }

            await fetch(`/api/data/clients/${clientId}/commission`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: commissionType, value })
            });

            // Update local state immediately for instant UI feedback
            setMyClients(prev => prev.map(client =>
                client.id === clientId
                    ? { ...client, commission: { type: commissionType, value } }
                    : client
            ));

            setEditingCommission(null);

            // Reload data from server to ensure sync (with small delay for DB write debouncing)
            setTimeout(() => {
                loadData();
            }, 150);

            onUpdate();
        } catch (e) {
            console.error('Failed to save commission', e);
            alert('Failed to save commission');
        }
    };

    const handleCancelEdit = () => {
        setEditingCommission(null);
        setCommissionValue('');
    };

    const getCommissionDisplay = (client: Client) => {
        const myClient = myClients.find(c => c.id === client.id);
        if (!myClient?.commission) return '-';

        const { type, value } = myClient.commission;
        if (type === 'fixed') {
            return `¥${value.toLocaleString()}`;
        } else {
            return `${value}%`;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white border-2 border-black w-full max-w-3xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-2">
                    <h2 className="text-xl font-black uppercase">Manage Clients</h2>
                    <button onClick={onClose} className="font-mono text-xs hover:underline">[CLOSE]</button>
                </div>

                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="SEARCH CLIENTS BY NAME..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full border-2 border-black px-3 py-2 text-xs font-mono focus:outline-none focus:bg-gray-50 placeholder:text-gray-400"
                    />
                </div>

                {loading ? (
                    <div className="text-center font-mono text-xs py-8">LOADING ACCOUNTS...</div>
                ) : (
                    <div className="max-h-[70vh] overflow-y-auto">
                        {availableAccounts.length === 0 ? (
                            <div className="text-center text-gray-500 font-mono text-xs py-4">
                                NO ACCOUNTS CONNECTED. PLEASE CONNECT GOOGLE/META FIRST.
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-black text-xs uppercase font-bold">
                                        <th className="py-2">Account Name</th>
                                        <th className="py-2 w-24">Provider</th>
                                        <th className="py-2 w-32">Commission</th>
                                        <th className="py-2 w-36 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {availableAccounts
                                        .filter(acc => acc.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map(acc => {
                                            const added = isAdded(acc.id);
                                            const isEditing = editingCommission === acc.id;

                                            return (
                                                <tr key={acc.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                                                    <td className="py-3 font-bold text-sm">{acc.name}</td>
                                                    <td className="py-3 text-xs font-mono text-gray-500">{acc.provider.toUpperCase()}</td>
                                                    <td className="py-3 text-xs font-mono">
                                                        {isEditing ? (
                                                            <div className="flex items-center gap-1">
                                                                <select
                                                                    value={commissionType}
                                                                    onChange={(e) => setCommissionType(e.target.value as 'fixed' | 'percentage')}
                                                                    className="border border-black px-1 py-0.5 text-xs"
                                                                >
                                                                    <option value="fixed">Fixed</option>
                                                                    <option value="percentage">%</option>
                                                                </select>
                                                                <input
                                                                    type="number"
                                                                    value={commissionValue}
                                                                    onChange={(e) => setCommissionValue(e.target.value)}
                                                                    placeholder="0"
                                                                    className="border border-black px-1 py-0.5 w-20 text-xs"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span>{getCommissionDisplay(acc)}</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 text-right">
                                                        <div className="flex gap-1 justify-end">
                                                            {isEditing ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleSaveCommission(acc.id)}
                                                                        className="text-xs font-mono bg-black text-white px-2 py-1 hover:bg-green-600 transition-colors"
                                                                    >
                                                                        SAVE
                                                                    </button>
                                                                    <button
                                                                        onClick={handleCancelEdit}
                                                                        className="text-xs font-mono border border-black px-2 py-1 hover:bg-gray-200 transition-colors"
                                                                    >
                                                                        CANCEL
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {added ? (
                                                                        <>
                                                                            <button
                                                                                onClick={() => handleEditCommission(acc)}
                                                                                className="text-xs font-mono border border-black px-2 py-1 hover:bg-black hover:text-white transition-colors"
                                                                            >
                                                                                COMMISSION
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleRemove(acc.id)}
                                                                                className="text-xs font-mono bg-black text-white px-2 py-1 hover:bg-red-600 transition-colors"
                                                                            >
                                                                                REMOVE
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleAdd(acc)}
                                                                            className="text-xs font-mono border border-black px-2 py-1 hover:bg-black hover:text-white transition-colors"
                                                                        >
                                                                            ADD
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
