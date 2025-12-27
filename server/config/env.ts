import dotenv from 'dotenv';

// Only load .env file in development (Railway injects vars directly)
if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

// Required environment variables
const requiredEnvVars = [
    'SESSION_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'META_CLIENT_ID',
    'META_CLIENT_SECRET',
    'FRONTEND_URL'
];

// Validate required environment variables
const missingVars: string[] = [];
requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.startsWith('your_') || value === '') {
        missingVars.push(varName);
    }
});

if (missingVars.length > 0) {
    console.error('================================================');
    console.error('❌ CRITICAL: MISSING ENVIRONMENT VARIABLES');
    console.error('The following variables are not set or invalid:');
    missingVars.forEach(v => console.error(`- ${v}`));
    console.error('Please configure these in your Railway dashboard.');
    console.error('================================================');

    // In production, we log the error but don't exit, 
    // Allowing the healthcheck to pass so logs can be checked.
}

// Export validated config
export const config = {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    session: {
        secret: process.env.SESSION_SECRET || 'temporary_secret_for_healthcheck_only',
        secure: process.env.NODE_ENV === 'production',
    },

    google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        developerToken: process.env.GOOGLE_DEVELOPER_TOKEN || '',
    },

    meta: {
        clientId: process.env.META_CLIENT_ID!,
        clientSecret: process.env.META_CLIENT_SECRET!,
    },

    logging: {
        level: process.env.LOG_LEVEL || 'info',
    },

    storage: {
        mode: process.env.STORAGE_MODE || 'local', // 'local' or 'cloud'
        bucketName: process.env.GCS_BUCKET_NAME || '',
    },

    frontend: {
        url: process.env.FRONTEND_URL || 'http://localhost:3000',
    },
};
