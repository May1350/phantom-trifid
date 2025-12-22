import React from 'react';

export interface DateRange {
    start: string; // YYYY-MM-DD
    end: string;   // YYYY-MM-DD
    preset?: string;
}

interface DateRangePickerProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange }) => {
    // Helper to format date
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const handlePreset = (preset: string) => {
        const today = new Date();
        let start = new Date(today);
        let end = new Date(today);

        switch (preset) {
            case 'today':
                // start, end are already today
                break;
            case 'this_month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                // end is today
                break;
            case 'last_month':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'this_week':
                // Today minus day of week (Sunday=0) to get Start(Sunday)
                start.setDate(today.getDate() - today.getDay());
                break;
            case 'last_week':
                // Last week Sunday
                start.setDate(today.getDate() - today.getDay() - 7);
                // Last week Saturday
                end.setDate(today.getDate() - today.getDay() - 1);
                break;
            case 'this_year':
                start = new Date(today.getFullYear(), 0, 1);
                break;
            case 'maximum':
                onChange({ start: '', end: '', preset: 'maximum' });
                return;
            default:
                break;
        }

        onChange({
            start: formatDate(start),
            end: formatDate(end),
            preset
        });
    };

    const isPresetActive = (preset: string) => value.preset === preset;

    return (
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div className="flex border border-black divide-x divide-black bg-white">
                {[
                    { label: 'This Month', key: 'this_month' },
                    { label: 'Last Month', key: 'last_month' },
                    { label: 'This Week', key: 'this_week' },
                    { label: 'Last Week', key: 'last_week' },
                    { label: 'This Year', key: 'this_year' },
                    { label: 'Max', key: 'maximum' }
                ].map((btn) => (
                    <button
                        key={btn.key}
                        onClick={() => handlePreset(btn.key)}
                        className={`px-3 py-1 uppercase transition-colors ${isPresetActive(btn.key) ? 'bg-black text-white' : 'hover:bg-gray-100'
                            }`}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-2 bg-white border border-black px-2 py-1">
                <input
                    type="date"
                    value={value.start}
                    onChange={(e) => onChange({ ...value, start: e.target.value, preset: undefined })}
                    className="bg-transparent focus:outline-none"
                />
                <span className="text-gray-400">to</span>
                <input
                    type="date"
                    value={value.end}
                    onChange={(e) => onChange({ ...value, end: e.target.value, preset: undefined })}
                    className="bg-transparent focus:outline-none"
                />
            </div>
        </div>
    );
};
