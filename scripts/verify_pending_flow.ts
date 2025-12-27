
import axios from 'axios';
import { db } from '../server/db';
import path from 'path';
import fs from 'fs';

// Setup DB path for server context (since we are running from root or scripts)
// Note: This script assumes it's run via ts-node from project root or server dir
// Adjust DB path mocking if necessary or rely on server running.

// Actually, best way is to run a small express app or hit the running server if possible.
// But we can verify by hitting the actual server endpoints.
// Assuming server is running at localhost:3001 (or whatever port)

const BASE_URL = 'http://localhost:3001/api';

async function runTest() {
    console.log('🧪 Starting Verification: Pending User Login Block');

    try {
        // 1. Create a pending user using the signup endpoint (simulate email signup)
        // Note: auth_signup.ts creates status: 'pending' now.
        const testEmail = `pending_test_${Date.now()}@example.com`;
        const testPassword = 'password123';

        console.log(`\nTesting Signup with ${testEmail}...`);
        const signupRes = await axios.post(`${BASE_URL}/auth/signup`, {
            email: testEmail,
            name: 'Pending Test User',
            password: testPassword
        });

        if (signupRes.data.success) {
            console.log('✅ Signup Successful. Account ID:', signupRes.data.accountId);
        } else {
            console.error('❌ Signup Failed:', signupRes.data);
            return;
        }

        // 2. Attempt Login
        console.log('\nTesting Login with Pending User...');
        try {
            await axios.post(`${BASE_URL}/session/login`, {
                email: testEmail,
                password: testPassword
            });
            console.error('❌ Login Unexpectedly Succeeded! (Should satisfy 403 or logic)');
        } catch (error: any) {
            if (error.response && error.response.status === 403) {
                console.log('✅ Login Blocked as Expected (403 Forbidden)');
                console.log('   Reason:', error.response.data.error);
            } else {
                console.error('❌ Login Failed with Unexpected Error:', error.response ? error.response.status : error.message);
            }
        }

    } catch (error: any) {
        console.error('❌ Test Execution Failed:', error.message);
        if (error.response) {
            console.error('   Response Data:', error.response.data);
        }
    }
}

runTest();
