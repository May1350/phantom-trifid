
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Create an axios instance that maintains cookies (for session)
const client = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    validateStatus: () => true // Handle 403/401 manually without throwing
});

// Admin client
const adminClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    validateStatus: () => true
});

async function runTest() {
    console.log('🧪 Starting Verification: Pending User Lifecycle');

    const testEmail = `pending_test_${Date.now()}@example.com`;
    const testPassword = 'Password123!';
    let newAccountId;

    // 1. Signup (Should be Pending)
    console.log(`\n1️⃣  Testing Signup with ${testEmail}...`);
    const signupRes = await client.post('/auth/signup', {
        email: testEmail,
        name: 'Pending Test User',
        password: testPassword
    });

    if (signupRes.status === 200) {
        console.log('✅ Signup Successful.');
        newAccountId = signupRes.data.accountId;
    } else {
        console.error('❌ Signup Failed:', signupRes.data);
        return;
    }

    // 2. Attempt Login (Should be Blocked)
    console.log('\n2️⃣  Testing Login with Pending User (Expect Block)...');
    const loginRes = await client.post('/session/login', {
        email: testEmail,
        password: testPassword
    });

    if (loginRes.status === 403) {
        console.log('✅ Login Blocked as Expected (403 Forbidden)');
        console.log('   Reason:', loginRes.data.error);
    } else {
        console.error(`❌ Login Unexpectedly returned status ${loginRes.status}:`, loginRes.data);
        // If it succeeded 200, that's a security fail.
    }

    // 3. Admin Login & Approval
    console.log('\n3️⃣  Admin Login & Approval...');

    // Admin Login
    const adminLogin = await adminClient.post('/session/login', {
        email: 'admin@gmail.com',
        password: '1111'
    });

    if (adminLogin.status === 200) {
        console.log('✅ Admin Logged In.');

        // Extract cookies
        const cookies = adminLogin.headers['set-cookie'];

        // Approve User
        console.log(`   Approving account ${newAccountId}...`);
        const updateRes = await adminClient.put(`/accounts/${newAccountId}`, {
            status: 'active'
        }, {
            headers: { Cookie: cookies }
        });

        if (updateRes.status === 200) {
            console.log('✅ Account Activated by Admin.');
        } else {
            console.error('❌ Admin Update Failed:', updateRes.data);
            return;
        }

    } else {
        console.error('❌ Admin Login Failed:', adminLogin.data);
        return;
    }

    // 4. Retry Login (Should Succeed)
    console.log('\n4️⃣  Retrying Login with Activated User (Expect Success)...');
    const retryLogin = await client.post('/session/login', {
        email: testEmail,
        password: testPassword
    });

    if (retryLogin.status === 200) {
        console.log('✅ Login Succeeded after Approval.');
        console.log('   Welcome,', retryLogin.data.account.name);
    } else {
        console.error(`❌ Login Verify Failed (Status ${retryLogin.status}):`, retryLogin.data);
    }
}

runTest();
