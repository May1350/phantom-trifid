import dotenv from 'dotenv';

dotenv.config();

// Required environment variables
const requiredEnvVars = [
    'SESSION_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'META_CLIENT_ID',
    'META_CLIENT_SECRET'
];

// Validate required environment variables
requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.startsWith('your_') || value === '') {
        throw new Error(
            `Missing or invalid environment variable: ${varName}. ` +
            `Please check your .env file and ensure all required variables are set.`
        );
    }
});

// Export validated config
export const config = {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    session: {
        secret: process.env.SESSION_SECRET!,
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
