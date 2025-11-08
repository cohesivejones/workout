import { Router, Request, Response } from "express";
import * as bcrypt from "bcrypt";
import dataSource from "../data-source";
import { User } from "../entities";
import { authenticateToken, generateToken } from "../middleware/auth";
import { LoginRequest } from "../types";
import logger from "../logger";

const router = Router();

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginRequest;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const userRepository = dataSource.getRepository(User);
    const normalizedEmail = email.toLowerCase();
    const user = await userRepository.findOne({ where: { email: normalizedEmail } });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const ok = user.password ? await bcrypt.compare(password, user.password) : false;
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    const token = generateToken(user);
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1000,
    });

    res.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    logger.error("Login error", { error: err });
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});

router.get("/me", authenticateToken, (req: Request, res: Response) => {
  const user = req.user!;
  res.json({ id: user.id, name: user.name, email: user.email });
});

router.post("/change-password", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
    const user = req.user!;

    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Current password and new password are required" });
    if (newPassword.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });

    const ok = user.password ? await bcrypt.compare(currentPassword, user.password) : false;
    if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const userRepository = dataSource.getRepository(User);
    await userRepository.update(user.id, { password: hashedPassword });

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    logger.error("Change password error", { error: err, userId: req.user?.id });
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
