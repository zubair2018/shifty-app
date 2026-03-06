// server/routes/partners.js
import { Router } from "express";
import { db, nextPartnerId } from "../memoryStore.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// Partner registration
router.post("/register", (req, res) => {
  const { name, phone, city, companyName } = req.body;

  if (!name || !phone || !city) {
    return res
      .status(400)
      .json({ error: "Name, phone and city are required." });
  }

  const id = String(nextPartnerId());
  const now = new Date().toISOString();

  const partner = {
    id,
    name,
    phone,
    city,
    companyName: companyName || "",
    createdAt: now
  };

  db.partners.push(partner);
  res.status(201).json({ ok: true, partner });
});

// Admin: all partners
router.get("/", requireAdmin, (_req, res) => {
  res.json({ ok: true, partners: db.partners });
});

export default router;
