import fs from "node:fs/promises";
import path from "node:path";
import { getUser } from "@/lib/auth";
import { UPLOAD_DIR } from "@/lib/action-utils";

const TYPES = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

// Foto bukti kedatangan hanya bisa dilihat pengguna yang sudah login.
export async function GET(_req, { params }) {
  const user = await getUser();
  if (!user || (user.role === "supplier" && user.supplier_status !== "approved")) {
    return new Response("Unauthorized", { status: 401 });
  }
  const name = params.name;
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(name)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const data = await fs.readFile(path.join(UPLOAD_DIR, name));
    return new Response(data, {
      headers: {
        "Content-Type": TYPES[path.extname(name)],
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
