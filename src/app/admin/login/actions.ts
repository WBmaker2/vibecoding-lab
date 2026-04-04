"use server";

import { redirect } from "next/navigation";
import { setAdminSession, verifyAdminPassword } from "@/lib/auth/session";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  if (!(await verifyAdminPassword(password))) {
    redirect("/admin/login?error=1");
  }

  await setAdminSession();
  redirect("/admin");
}
