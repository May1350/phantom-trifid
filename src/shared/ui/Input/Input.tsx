import React, { type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
    return (
        <div className={`flex flex-col gap-1 w-full ${className}`}>
            {label && (
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    {label}
                </label>
            )}
            <input
                className="font-mono text-sm border-b border-gray-300 focus:border-black bg-transparent py-2 outline-none transition-colors duration-100 placeholder:text-gray-300"
                {...props}
            />
            {error && (
                <span className="text-xs text-accent font-bold uppercase mt-1">
                    {error}
                </span>
            )}
        </div>
    );
};
