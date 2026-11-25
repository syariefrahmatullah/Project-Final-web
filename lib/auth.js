import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { queryOne } from "@/lib/db";

const COOKIE = "wms_session";
const secret = () =>
  new TextEncoder().encode(
    process.env.SESSION_SECRET || "dev-secret-ganti-di-env-local-minimal-32-karakter"
  );

export const ROLE_LABEL = {
  admin: "Admin",
  manager: "Warehouse Manager",
  staff: "Staff Gudang",
  supplier: "Supplier",
};

export async function createSession(userId) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret());
  // Fix Bug #2: cookies() mengembalikan Promise di Next.js 15, wajib await
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

// Fix Bug #6: destroySession dijadikan async agar bisa await cookies()
export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

// Mengambil user dari database pada setiap request, sehingga perubahan
// status supplier (approved/rejected) langsung berlaku.
export async function getUser() {
  // Fix Bug #2: await cookies()
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return await queryOne(
      `SELECT id, name, email, role, company, supplier_status, reject_reason
         FROM users WHERE id = $1`,
      [payload.uid]
    );
  } catch {
    return null;
  }
}

// Untuk halaman: wajib login dan salah satu peran yang diizinkan.
export async function requireRole(...roles) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.role === "supplier" && user.supplier_status !== "approved") {
    redirect("/pending");
  }
  if (roles.length && !roles.includes(user.role)) redirect("/forbidden");
  return user;
}

// Untuk server action: melempar error (bukan redirect) jika tidak berhak.
export async function assertRole(...roles) {
  const user = await getUser();
  if (!user) throw new Error("Sesi berakhir. Silakan login kembali.");
  if (user.role === "supplier" && user.supplier_status !== "approved") {
    throw new Error("Akun Supplier belum disetujui Admin.");
  }
  if (roles.length && !roles.includes(user.role)) {
    throw new Error("Anda tidak memiliki hak akses untuk aksi ini.");
  }
  return user;
}
