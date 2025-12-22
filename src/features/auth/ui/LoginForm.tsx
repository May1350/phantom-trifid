import React from 'react';
import { Button, Input } from '../../../shared/ui';
import axios from 'axios';

interface LoginFormProps {
    onLogin: (role: 'admin' | 'agency', accountInfo: any) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post(
                'http://localhost:3001/api/session/login',
                { email, password },
                { withCredentials: true }
            );

            if (response.data.success) {
                const account = response.data.account;
                // account.type is already 'admin' or 'agency' in backend
                const role = account.type === 'admin' ? 'admin' : 'agency';
                onLogin(role, account);
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || 'LOGIN FAILED.';
            setError(errorMessage.toUpperCase());
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-sm">
            <div className="flex flex-col gap-4">
                <Input
                    label="Email Address"
                    type="email"
                    placeholder="USER@AGENCY.COM"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    required
                />
                <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    error={error}
                />
            </div>

            <div className="pt-4">
                <Button fullWidth type="submit" disabled={loading}>
                    {loading ? 'AUTHENTICATING...' : 'ENTER SYSTEM'}
                </Button>
            </div>

            <div className="flex justify-between text-xs text-gray-400 font-mono pt-2">
                <a href="#" className="hover:text-black hover:underline uppercase">Reset Password</a>
                <a href="#" className="hover:text-black hover:underline uppercase">Contact Admin</a>
            </div>
        </form>
    );
};
