import { isValidPassword } from "../utils/passwordPolicy.js";

export const validateSignup = (req, res, next) => {
  const { name, email, address, password } = req.body;

  if (!name || name.length < 20 || name.length > 60) {
    return res.status(400).json({ message: "Name must be 20-60 chars" });
  }
  if (address && address.length > 400) {
    return res.status(400).json({ message: "Address too long" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "")) {
    return res.status(400).json({ message: "Invalid email" });
  }
  if (!isValidPassword(password || "")) {
    return res.status(400).json({
      message:
        "Password 8-16 chars, include at least one uppercase and one special char",
    });
  }

  next();
};
