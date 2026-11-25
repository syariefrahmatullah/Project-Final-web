"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { guarded, str, UserError } from "@/lib/action-utils";

export async function loginAction(_prev, fd) {
  const result = await guarded(async () => {
    const email = str(fd, "email").toLowerCase();
    const password = String(fd.get("password") ?? "");
    if (!email || !password) throw new UserError("Email dan password wajib diisi.");
    const user = await queryOne(`SELECT * FROM users WHERE email = $1`, [email]);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new UserError("Email atau password salah.");
    }
    await createSession(user.id);
    return { ok: true, supplierPending: user.role === "supplier" && user.supplier_status !== "approved" };
  });
  if (result.error) return result;
  redirect(result.supplierPending ? "/pending" : "/dashboard");
}

// Hanya Supplier yang bisa mendaftar sendiri; status awal Pending (menunggu Admin).
export async function registerSupplierAction(_prev, fd) {
  const result = await guarded(async () => {
    const name = str(fd, "name");
    const company = str(fd, "company");
    const email = str(fd, "email").toLowerCase();
    const phone = str(fd, "phone");
    const address = str(fd, "address");
    const password = String(fd.get("password") ?? "");
    if (!name || !company || !email || !phone || !address) {
      throw new UserError("Semua kolom wajib diisi.");
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new UserError("Format email tidak valid.");
    if (password.length < 6) throw new UserError("Password minimal 6 karakter.");
    const exists = await queryOne(`SELECT 1 FROM users WHERE email = $1`, [email]);
    if (exists) throw new UserError("Email sudah terdaftar.");
    const hash = await bcrypt.hash(password, 10);
    const [u] = await query(
      `INSERT INTO users (name, email, password_hash, role, company, phone, address, supplier_status)
       VALUES ($1,$2,$3,'supplier',$4,$5,$6,'pending') RETURNING id`,
      [name, email, hash, company, phone, address]
    );
    await createSession(u.id);
    return { ok: true };
  });
  if (result.error) return result;
  redirect("/pending");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
