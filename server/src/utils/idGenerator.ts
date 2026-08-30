import prisma from './prisma';

export async function generateCustomerUserId(name: string): Promise<string> {
  const cleanName = name.trim().replace(/[^a-zA-Z]/g, '').toUpperCase();
  const prefix = cleanName.length >= 3 ? cleanName.substring(0, 3) : (cleanName + 'CUST').substring(0, 3);

  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const randomDigits = Math.floor(10000 + Math.random() * 90000).toString(); // 5 digit number
    const candidateId = `${prefix}${randomDigits}`;

    try {
      const existingUser = await prisma.user.findUnique({
        where: { userId: candidateId },
      });

      if (!existingUser) {
        return candidateId;
      }
    } catch (dbErr: any) {
      // If DB is offline during generation or error occurs, return candidate ID
      return candidateId;
    }
    attempts++;
  }

  return `${prefix}${Date.now().toString().slice(-5)}`;
}
