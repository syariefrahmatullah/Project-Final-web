"use client";

import { useEffect } from "react";

const LONG = ["notes", "description", "address", "reason", "note"];
const MAX = { sku: 60, name: 120, unit: 30, phone: 40, email: 160, company: 160, customer: 160 };

// Memasang maxLength otomatis ke semua kolom teks yang belum punya batas.
export default function InputLimits() {
  useEffect(() => {
    const apply = () => {
      document.querySelectorAll("input[name], textarea[name]").forEach((el) => {
        const skip = el.tagName === "INPUT" && !["text", "email", "tel"].includes(el.type);
        if (skip || el.maxLength > 0) return;
        el.maxLength = LONG.includes(el.name) ? 1000 : MAX[el.name] ?? 255;
      });
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);
  return null;
}