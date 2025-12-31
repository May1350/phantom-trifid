import React, { useState, useEffect } from 'react';

interface AlertSettings {
    enabledTypes: string[];
    dailyBudgetThreshold: number;
    progressMismatchThreshold: number;
    exhaustionThreshold: number;
}

interface AlertSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ALERT_TYPES = [
    { id: 'daily_budget_over', label: 'Daily Budget Over' },
    { id: 'daily_budget_under', label: 'Daily Budget Under' },
    { id: 'progress_mismatch_over', label: 'Progress Mismatch (Over)' },
    { id: 'progress_mismatch_under', label: 'Progress Mismatch (Under)' },
    { id: 'campaign_ending', label: 'Campaign Ending Soon' },
    { id: 'budget_almost_exhausted', label: 'Budget Almost Exhausted' },
    { id: 'budget_not_set', label: 'Budget Not Set' },
];

export const AlertSettingsModal: React.FC<AlertSettingsModalProps> = ({ isOpen, onClose }) => {
    const [settings, setSettings] = useState<AlertSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchSettings();
        }
    }, [isOpen]);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/alerts/settings');
            const data = await res.json();
            setSettings(data);
        } catch (error) {
            console.error('Failed to fetch alert settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            const res = await fetch('/api/alerts/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (res.ok) {
                onClose();
            }
        } catch (error) {
            console.error('Failed to save alert settings:', error);
        } finally {
            setSaving(false);
        }
    };

    const toggleType = (id: string) => {
        if (!settings) return;
        const newEnabledTypes = settings.enabledTypes.includes(id)
            ? settings.enabledTypes.filter(t => t !== id)
            : [...settings.enabledTypes, id];
        setSettings({ ...settings, enabledTypes: newEnabledTypes });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-black text-white p-4 flex justify-between items-center border-b-2 border-black">
                    <h2 className="font-black uppercase tracking-tighter text-lg">Alert Settings</h2>
                    <button onClick={onClose} className="hover:text-gray-400 font-bold">[CLOSE]</button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 font-mono text-[11px]">
                    {loading ? (
                        <div className="flex justify-center p-8 uppercase">Loading Settings...</div>
                    ) : (
                        <div className="space-y-6">
                            <section>
                                <h3 className="font-bold border-b border-black/10 pb-2 mb-3 uppercase tracking-wider">Alert Types</h3>
                                <div className="space-y-2">
                                    {ALERT_TYPES.map(type => (
                                        <label key={type.id} className="flex items-center gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={settings?.enabledTypes.includes(type.id)}
                                                onChange={() => toggleType(type.id)}
                                                className="w-4 h-4 border-2 border-black rounded-none appearance-none checked:bg-black relative before:content-[''] before:absolute before:inset-0.5 before:bg-white before:scale-0 checked:before:scale-100 transition-all cursor-pointer"
                                            />
                                            <span className="uppercase group-hover:underline">{type.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="font-bold border-b border-black/10 pb-2 mb-3 uppercase tracking-wider">Thresholds (%)</h3>

                                <div className="space-y-1">
                                    <label className="block font-bold">DAILY BUDGET MISMATCH</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={settings?.dailyBudgetThreshold}
                                            onChange={e => setSettings(s => s ? ({ ...s, dailyBudgetThreshold: Number(e.target.value) }) : null)}
                                            className="w-20 px-2 py-1 border border-black focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                        <span>%</span>
                                    </div>
                                    <p className="text-[9px] text-gray-500 uppercase italic">Trigger when spend vs budget diff exceeds this %</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="block font-bold">PROGRESS MISMATCH</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={settings?.progressMismatchThreshold}
                                            onChange={e => setSettings(s => s ? ({ ...s, progressMismatchThreshold: Number(e.target.value) }) : null)}
                                            className="w-20 px-2 py-1 border border-black focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                        <span>%</span>
                                    </div>
                                    <p className="text-[9px] text-gray-500 uppercase italic">Trigger when spend % vs time % diff exceeds this %</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="block font-bold">BUDGET EXHAUSTION</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={settings?.exhaustionThreshold}
                                            onChange={e => setSettings(s => s ? ({ ...s, exhaustionThreshold: Number(e.target.value) }) : null)}
                                            className="w-20 px-2 py-1 border border-black focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                        <span>%</span>
                                    </div>
                                    <p className="text-[9px] text-gray-500 uppercase italic">Trigger when budget consumption reaches this %</p>
                                </div>
                            </section>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t-2 border-black flex justify-end gap-3 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-black uppercase font-mono text-[11px] hover:bg-black/5 active:scale-95 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-black text-white uppercase font-black text-[11px] hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};
