import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LoginForm } from '../../../features/auth/ui/LoginForm';
import { storage } from '../../../shared/lib/storage';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();

    const handleLogin = (role: 'admin' | 'agency', accountInfo: any) => {
        storage.set('user_role', role);
        storage.set('account_info', JSON.stringify(accountInfo));

        if (role === 'admin') {
            navigate('/admin');
        } else {
            navigate('/dashboard');
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-white">
            <div className="w-full max-w-md border border-black p-8 md:p-12 relative">
                {/* Decorative corner markers for that 'technical' feel */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-black -mt-[1px] -ml-[1px]"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-black -mt-[1px] -mr-[1px]"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-black -mb-[1px] -ml-[1px]"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-black -mb-[1px] -mr-[1px]"></div>

                <div className="mb-12 text-center">
                    <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">
                        Phantom Trifid
                    </h1>
                    <p className="font-mono text-xs uppercase text-gray-500 tracking-widest">
                        Budget Management System v1.0
                    </p>
                </div>

                <LoginForm onLogin={handleLogin} />

                <div className="mt-8 pt-8 border-t border-gray-100 space-y-4">
                    <button
                        onClick={() => window.location.href = '/api/auth/google/login'}
                        className="w-full bg-white border-2 border-black py-3 font-bold uppercase hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                        <span className="font-serif font-black text-lg">G</span>
                        <span>Log in with Google</span>
                    </button>

                    <div className="text-center">
                        <Link to="/signup" className="text-xs font-mono text-gray-500 hover:text-black uppercase border-b border-transparent hover:border-black transition-colors">
                            Create an account
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
