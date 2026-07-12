import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";
import { hasAdminSession } from "@/lib/auth/session";

export default async function ProtectedAdminLayout({
  children
}: PropsWithChildren) {
  if (!(await hasAdminSession())) {
    redirect("/admin/login");
  }

  return children;
}
