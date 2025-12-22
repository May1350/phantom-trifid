import React from 'react';

interface MonthPickerProps {
    currentDate: Date;
    onChange: (date: Date) => void;
}

export const MonthPicker: React.FC<MonthPickerProps> = ({ currentDate, onChange }) => {
    const handlePrevMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        onChange(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        onChange(newDate);
    };

    const formattedMonth = currentDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
    });

    return (
        <div className="flex items-center gap-4 bg-white border border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <button
                onClick={handlePrevMonth}
                className="px-3 py-1 hover:bg-gray-100 border border-transparent hover:border-black transition-all font-bold text-lg"
                aria-label="Previous Month"
            >
                ←
            </button>
            <div className="font-mono font-bold text-lg min-w-[140px] text-center uppercase tracking-wider">
                {formattedMonth}
            </div>
            <button
                onClick={handleNextMonth}
                className="px-3 py-1 hover:bg-gray-100 border border-transparent hover:border-black transition-all font-bold text-lg"
                aria-label="Next Month"
            >
                →
            </button>
        </div>
    );
};
