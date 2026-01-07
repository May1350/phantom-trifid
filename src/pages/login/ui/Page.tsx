import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { LoginForm } from '../../../features/auth/ui/LoginForm';
import { storage } from '../../../shared/lib/storage';
import { GoogleSignInButton } from '../../../shared/ui/GoogleSignInButton';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const error = searchParams.get('error');
        const email = searchParams.get('email');

        if (error === 'not_registered') {
            setErrorMessage(
                email
                    ? `Account ${email} is not registered. Please sign up first.`
                    : 'This account is not registered. Please sign up first.'
            );
        } else if (error === 'account_pending') {
            setErrorMessage('Your account is pending approval by an administrator.');
        } else if (error === 'account_suspended') {
            setErrorMessage('Your account has been suspended. Please contact support.');
        }
    }, [searchParams]);

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
                        A
                    </h1>
                    <p className="font-mono text-xs uppercase text-gray-500 tracking-widest">
                        Budget Management System v1.0
                    </p>
                </div>

                {/* Error Message */}
                {errorMessage && (
                    <div className="mb-6 bg-red-50 border-2 border-red-500 p-4">
                        <div className="flex items-start gap-3">
                            <span className="text-red-500 font-bold text-xl">⚠</span>
                            <div className="flex-1">
                                <p className="font-bold uppercase text-red-700 text-sm mb-1">
                                    Account Error
                                </p>
                                <p className="text-red-600 text-sm mb-3">
                                    {errorMessage}
                                </p>
                                {searchParams.get('error') === 'not_registered' && (
                                    <Link
                                        to="/signup"
                                        className="inline-block bg-red-500 text-white px-4 py-2 text-xs font-bold uppercase hover:bg-red-600 transition-colors"
                                    >
                                        Create Account →
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <LoginForm onLogin={handleLogin} />

                <div className="mt-8 pt-8 border-t border-gray-100 space-y-4">
                    <GoogleSignInButton
                        onClick={() => window.location.href = '/api/auth/google/login'}
                        label="Continue with Google"
                        className="w-full !py-3 !shadow-none !border-2 !border-black !rounded-none font-bold uppercase"
                    />

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
