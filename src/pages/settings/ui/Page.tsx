import React, { useState, useEffect } from 'react';

interface AlertSettings {
    enabledTypes: string[];
    dailyBudgetThreshold: number;
    progressMismatchThreshold: number;
    exhaustionThreshold: number;
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

export const SettingsPage: React.FC = () => {
    const [settings, setSettings] = useState<AlertSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

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
        setSaved(false);
        try {
            const res = await fetch('/api/alerts/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
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

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-black uppercase tracking-tighter mb-8 border-b-4 border-black pb-2">
                General Settings
            </h1>

            <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
                <h2 className="font-black uppercase tracking-tighter text-xl mb-6">Alert Notifications</h2>

                {loading ? (
                    <div className="font-mono text-sm uppercase p-4">Loading Settings...</div>
                ) : (
                    <div className="space-y-8">
                        <section>
                            <h3 className="font-bold border-b border-black/10 pb-2 mb-4 uppercase tracking-wider text-sm">Alert Types</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {ALERT_TYPES.map(type => (
                                    <label key={type.id} className="flex items-center gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={settings?.enabledTypes.includes(type.id)}
                                            onChange={() => toggleType(type.id)}
                                            className="w-5 h-5 border-2 border-black rounded-none appearance-none checked:bg-black checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M20%206L9%2017l-5-5%22%2F%3E%3C%2Fsvg%3E')] bg-center bg-no-repeat transition-all cursor-pointer"
                                        />
                                        <span className="uppercase font-mono text-xs group-hover:underline">{type.label}</span>
                                    </label>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-6">
                            <h3 className="font-bold border-b border-black/10 pb-2 mb-4 uppercase tracking-wider text-sm">Thresholds (%)</h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-2">
                                    <label className="block font-bold font-mono text-xs uppercase">Daily Budget</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={settings?.dailyBudgetThreshold}
                                            onChange={e => setSettings(s => s ? ({ ...s, dailyBudgetThreshold: Number(e.target.value) }) : null)}
                                            className="w-full px-3 py-2 border-2 border-black font-mono focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                        <span className="font-bold">%</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 uppercase italic leading-tight">Trigger when spend vs budget diff exceeds this %</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="block font-bold font-mono text-xs uppercase">Progress Mismatch</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={settings?.progressMismatchThreshold}
                                            onChange={e => setSettings(s => s ? ({ ...s, progressMismatchThreshold: Number(e.target.value) }) : null)}
                                            className="w-full px-3 py-2 border-2 border-black font-mono focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                        <span className="font-bold">%</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 uppercase italic leading-tight">Trigger when spend % vs time % diff exceeds this %</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="block font-bold font-mono text-xs uppercase">Budget Exhaustion</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={settings?.exhaustionThreshold}
                                            onChange={e => setSettings(s => s ? ({ ...s, exhaustionThreshold: Number(e.target.value) }) : null)}
                                            className="w-full px-3 py-2 border-2 border-black font-mono focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                        <span className="font-bold">%</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 uppercase italic leading-tight">Trigger when budget consumption reaches this %</p>
                                </div>
                            </div>
                        </section>

                        <div className="pt-6 border-t-2 border-black flex items-center justify-between">
                            <div className={`text-xs font-mono uppercase text-green-600 font-bold transition-opacity ${saved ? 'opacity-100' : 'opacity-0'}`}>
                                Settings Saved Successfully
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-8 py-3 bg-black text-white uppercase font-black text-sm hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
