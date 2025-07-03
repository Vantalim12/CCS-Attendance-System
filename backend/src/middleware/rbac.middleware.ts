import { RequestHandler } from "express";

export const authorizeRoles = (...roles: string[]): RequestHandler => {
  return (req, res, next) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ message: "Forbidden: insufficient role" });
      return;
    }
    next();
  };
};
