"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

interface ReturnToArchiveLinkProps {
  children: ReactNode;
  className?: string;
  fallbackHref?: string;
}

function getSafeReturnHref(fallbackHref: string) {
  const safeFallback =
    fallbackHref.startsWith("/") && !fallbackHref.startsWith("//")
      ? fallbackHref
      : "/";
  const value = new URLSearchParams(window.location.search).get("return_to");
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : safeFallback;
}

export function ReturnToArchiveLink({
  children,
  className,
  fallbackHref = "/"
}: ReturnToArchiveLinkProps) {
  const [href, setHref] = useState(fallbackHref);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setHref(getSafeReturnHref(fallbackHref)),
      0
    );
    return () => window.clearTimeout(timer);
  }, [fallbackHref]);

  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}
