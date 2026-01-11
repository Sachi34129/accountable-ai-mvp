// Express/Passport type augmentation for req.user
// This keeps route handlers type-safe without fighting Express' RequestHandler types.

declare global {
  namespace Express {
    // Passport attaches `req.user`. We define the shape we store in Prisma/user auth.
    interface User {
      id: string;
      email: string;
      persona: string;
    }
  }
}

export {};


