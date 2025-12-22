import React, { type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'accent' | 'outline';
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    fullWidth = false,
    className = '',
    ...props
}) => {
    const baseStyles = "font-mono font-bold uppercase transition-colors duration-100 ease-in-out border text-sm py-3 px-6 flex items-center justify-center";

    const variants = {
        primary: "border-black bg-black text-white hover:bg-white hover:text-black",
        accent: "border-accent bg-accent text-white hover:bg-white hover:text-accent hover:border-accent",
        outline: "border-black bg-transparent text-black hover:bg-black hover:text-white"
    };

    const widthStyles = fullWidth ? "w-full" : "";

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${widthStyles} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};
