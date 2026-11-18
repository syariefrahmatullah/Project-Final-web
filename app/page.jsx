import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

export default async function Home() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.role === "supplier" && user.supplier_status !== "approved") redirect("/pending");
  redirect("/dashboard");
}
