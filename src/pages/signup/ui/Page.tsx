import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';

export const SignupPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [urlError, setUrlError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const errorParam = searchParams.get('error');
        const emailParam = searchParams.get('email');

        if (errorParam === 'already_registered') {
            setUrlError(
                emailParam
                    ? `Account ${emailParam} is already registered. Please log in instead.`
                    : 'This account is already registered. Please log in instead.'
            );
        }
    }, [searchParams]);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name })
            });

            const data = await res.json();

            if (res.ok) {
                // Auto-login successful, redirect to dashboard or welcome
                navigate('/dashboard');
            } else {
                setError(data.error || 'Signup failed');
            }
        } catch (err) {
            setError('Network error occurred');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = () => {
        window.location.href = '/api/auth/google/signup';
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md p-8 border border-white/20 shadow-[0_0_50px_-12px_rgba(255,255,255,0.2)]">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">JOIN PHANTOM</h1>
                    <p className="text-gray-500 font-mono text-xs uppercase">Create your agency account</p>
                </div>

                {/* URL Error Message (from Google signup redirect) */}
                {urlError && (
                    <div className="mb-6 bg-red-50 border-2 border-red-500 p-4">
                        <div className="flex items-start gap-3">
                            <span className="text-red-500 font-bold text-xl">⚠</span>
                            <div className="flex-1">
                                <p className="font-bold uppercase text-red-700 text-sm mb-1">
                                    Account Already Exists
                                </p>
                                <p className="text-red-600 text-sm mb-3">
                                    {urlError}
                                </p>
                                <Link
                                    to="/login"
                                    className="inline-block bg-red-500 text-white px-4 py-2 text-xs font-bold uppercase hover:bg-red-600 transition-colors"
                                >
                                    Go to Login →
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Agency Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-black p-3 outline-none transition-colors font-mono text-sm"
                            placeholder="YOUR AGENCY NAME"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-black p-3 outline-none transition-colors font-mono text-sm"
                            placeholder="email@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-black p-3 outline-none transition-colors font-mono text-sm"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-black p-3 outline-none transition-colors font-mono text-sm"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 text-xs font-mono">
                            ERROR: {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white py-4 font-bold uppercase hover:bg-gray-900 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={handleGoogleSignup}
                        className="w-full bg-white border-2 border-black py-3 font-bold uppercase hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                        {/* Simple G icon */}
                        <span className="font-serif font-black text-lg">G</span>
                        <span>Sign up with Google</span>
                    </button>
                </div>

                <div className="mt-6 text-center">
                    <Link to="/login" className="text-xs font-mono text-gray-500 hover:text-black uppercase border-b border-transparent hover:border-black transition-colors">
                        Already have an account? Log In
                    </Link>
                </div>
            </div>
        </div>
    );
};
