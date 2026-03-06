// server/routes/auth.js
import { Router } from "express";

const router = Router();

router.get("/status", (_req, res) => {
  res.json({ ok: true });
});

// add login/register later

export default router;
