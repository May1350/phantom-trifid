import React from 'react';

interface GoogleSignInButtonProps {
    onClick: () => void;
    label?: string;
    className?: string;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
    onClick,
    label = "Sign in with Google",
    className = ""
}) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-center gap-3 bg-white border border-[#dadce0] rounded-md px-4 py-2 hover:bg-[#f8f9fa] transition-colors shadow-sm ${className}`}
            style={{ fontFamily: "'Roboto', sans-serif" }}
        >
            <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285f4" />
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34a853" />
                <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.712s.102-1.173.282-1.712V4.956H.957a9.023 9.023 0 000 8.088l3.007-2.332z" fill="#fbbc05" />
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.956L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#ea4335" />
            </svg>
            <span className="text-[#3c4043] font-medium text-sm">{label}</span>
        </button>
    );
};
