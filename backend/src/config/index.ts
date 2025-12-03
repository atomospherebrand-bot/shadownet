import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 6070,
  databaseUrl: process.env.DATABASE_URL || 'postgres://shadownet:shadownet@localhost:5432/shadownet',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  adminUser: process.env.ADMIN_USER || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin',
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  publicBaseUrl: process.env.PUBLIC_BASE_URL,
};
