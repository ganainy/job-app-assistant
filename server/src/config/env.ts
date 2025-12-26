// server/src/config/env.ts
// This file MUST be imported first to ensure environment variables are loaded
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try to find .env file in multiple locations
const possibleEnvPaths = [
    path.resolve(__dirname, '..', '..', '.env'),     // From src/config/ go up to server/
    path.resolve(process.cwd(), '.env'),              // Current working directory
    path.resolve(process.cwd(), 'server', '.env'),    // Monorepo root/server/
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log(`Loaded .env from: ${envPath}`);
        envLoaded = true;
        break;
    }
}

if (!envLoaded) {
    console.error('Could not find .env file in any expected location:', possibleEnvPaths);
    process.exit(1);
}

// Export validated environment variables
export const env = {
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRY: process.env.JWT_EXPIRY || '1d',
    MONGODB_URI: process.env.MONGODB_URI,
    PORT: process.env.PORT || '5001',
    NODE_ENV: process.env.NODE_ENV || 'development',
    FRONTEND_URL: process.env.FRONTEND_URL,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
};
