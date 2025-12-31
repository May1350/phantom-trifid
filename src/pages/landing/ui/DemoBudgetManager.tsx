import React, { useState } from 'react';

interface DemoBudgetManagerProps {
    isOpen: boolean;
    onClose: () => void;
    campaign: { id: string; name: string; spend: number; budget: number } | null;
    onSave: (newBudget: number) => void;
}

export const DemoBudgetManager: React.FC<DemoBudgetManagerProps> = ({ isOpen, onClose, campaign, onSave }) => {
    const [amount, setAmount] = useState<number>(campaign?.budget || 0);

    // Update local state if campaign changes
    React.useEffect(() => {
        if (campaign) {
            setAmount(campaign.budget);
        }
    }, [campaign]);

    if (!isOpen || !campaign) return null;

    const handleSave = () => {
        onSave(amount);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white w-full max-w-md border-4 border-black p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in duration-200">
                <header className="flex justify-between items-center mb-6 border-b-2 border-black pb-2">
                    <h2 className="text-xl font-black uppercase">Set Monthly Budget</h2>
                    <button onClick={onClose} className="text-2xl font-bold hover:text-red-600 transition-colors">×</button>
                </header>

                <div className="mb-6">
                    <div className="text-[10px] font-mono text-gray-400 uppercase mb-1">CAMPAIGN</div>
                    <div className="font-bold text-sm bg-gray-50 p-2 border border-black/10">{campaign.name}</div>
                </div>

                <div className="mb-8">
                    <label className="block text-xs font-bold uppercase mb-2 flex items-center gap-2">
                        <span>💰</span> Monthly Budget (JPY)
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-gray-400">¥</span>
                        <input
                            type="number"
                            value={amount || ''}
                            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                            className="w-full border-2 border-black p-3 pl-8 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-black transition-all"
                            placeholder="e.g. 1000000"
                            autoFocus
                        />
                    </div>
                    <p className="text-[10px] font-mono text-gray-500 mt-2 italic">
                        * In the real app, we calculate your commission automatically.
                    </p>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={handleSave}
                        className="w-full bg-black text-white py-4 font-black uppercase tracking-widest hover:bg-gray-800 active:translate-y-1 active:shadow-none transition-all border-b-4 border-gray-700"
                    >
                        Save Settings
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full bg-white text-black py-2 font-bold uppercase text-xs hover:underline"
                    >
                        Cancel
                    </button>
                </div>

                <div className="mt-6 pt-6 border-t border-dashed border-black/20 text-center">
                    <div className="inline-block bg-yellow-100 border border-yellow-400 px-3 py-1 animate-bounce">
                        <span className="text-[10px] font-bold uppercase tracking-tighter text-yellow-800">
                            Try changing the budget to see real-time pacing!
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
