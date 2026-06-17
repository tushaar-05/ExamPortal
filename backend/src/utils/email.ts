import prisma from './prisma';

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const findUserByEmail = (email: string) => {
  return prisma.user.findFirst({
    where: {
      email: {
        equals: normalizeEmail(email),
        mode: 'insensitive',
      },
    },
  });
};
