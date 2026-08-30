import prisma from './prisma';

export async function checkDatabaseConnection(): Promise<{ connected: boolean; message?: string }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true };
  } catch (error: any) {
    return {
      connected: false,
      message: error?.message || 'Database connection failed',
    };
  }
}
