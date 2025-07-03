import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import Organization from "../models/Organization";

const JWT_SECRET = process.env.JWT_SECRET || "changeme";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, role, organizationName } = req.body;
    if (!email || !password || !role || !organizationName) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }
    let organization = await Organization.findOne({ name: organizationName });
    if (!organization) {
      organization = await Organization.create({ name: organizationName });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      passwordHash,
      role,
      organizationId: organization._id,
    });
    res.status(201).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Registration failed", error });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        organizationId: user.organizationId,
      },
      JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error });
  }
};
