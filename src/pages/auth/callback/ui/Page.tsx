import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { storage } from '../../../../shared/lib/storage';

export const AuthCallbackPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const role = searchParams.get('role');
        const id = searchParams.get('id');
        const name = searchParams.get('name');
        const email = searchParams.get('email');

        if (role && id && email) {
            // Update Local Storage
            storage.set('user_role', role);
            storage.set('account_info', {
                id,
                name,
                email,
                type: role
            });

            // Redirect based on role
            if (role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        } else {
            // Failed or invalid params
            console.error('Missing auth params');
            navigate('/login');
        }
    }, [searchParams, navigate]);

    return (
        <div className="flex items-center justify-center h-screen bg-white">
            <div className="text-center">
                <div className="font-mono text-xs uppercase mb-2">Authenticating...</div>
                <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
        </div>
    );
};
