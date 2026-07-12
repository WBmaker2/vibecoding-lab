import type { LookupAddress } from "node:dns";

type LookupFn = (
  hostname: string,
  options: { all: true; verbatim: true }
) => Promise<LookupAddress[]>;

export interface RemoteNetworkBudget {
  remaining: number;
}

export interface RemoteUrlOptions {
  budget?: RemoteNetworkBudget;
  deadline?: number;
  lookup?: LookupFn;
  signal?: AbortSignal;
}

export interface FetchSafeHtmlOptions extends RemoteUrlOptions {
  headers?: HeadersInit;
  maxBytes?: number;
  maxRedirects?: number;
  timeoutMs?: number;
}

export interface FetchSafeResourceOptions extends RemoteUrlOptions {
  headers?: HeadersInit;
  maxBytes?: number;
  maxRedirects?: number;
  method: "GET" | "HEAD";
  timeoutMs?: number;
}

export interface SafeResourceResponse {
  body: Buffer;
  finalUrl: string;
  headers: Record<string, string>;
  statusCode: number;
}

export function isPublicIpAddress(address: string): boolean;
export function assertSafeRemoteHttpUrl(
  input: string | URL,
  options?: RemoteUrlOptions
): Promise<URL>;
export function fetchSafeHtml(
  input: string | URL,
  options?: FetchSafeHtmlOptions
): Promise<{ finalUrl: string; html: string }>;
export function fetchSafeResource(
  input: string | URL,
  options: FetchSafeResourceOptions
): Promise<SafeResourceResponse>;
