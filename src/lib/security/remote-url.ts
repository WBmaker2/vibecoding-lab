import { lookup as dnsLookup, type LookupAddress } from "node:dns/promises";
import { isIP } from "node:net";

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_BYTES = 1_048_576;
const DEFAULT_MAX_REDIRECTS = 3;

type LookupFn = (
  hostname: string,
  options: { all: true; verbatim: true }
) => Promise<LookupAddress[]>;

interface RemoteUrlOptions {
  lookup?: LookupFn;
}

export interface FetchSafeHtmlOptions extends RemoteUrlOptions {
  headers?: HeadersInit;
  maxBytes?: number;
  maxRedirects?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
}

function isInRange(value: number, start: number, end: number) {
  return value >= start && value <= end;
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return true;
  }

  const [first, second, third] = parts;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && isInRange(second, 64, 127)) ||
    (first === 169 && second === 254) ||
    (first === 172 && isInRange(second, 16, 31)) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 192 && second === 168) ||
    (first === 198 && second === 18) ||
    (first === 198 && second === 19) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    isInRange(first, 224, 255)
  );
}

function parseIpv6(address: string) {
  const normalized = address.toLowerCase();
  const pieces = normalized.split("::");

  if (pieces.length > 2) {
    return null;
  }

  const expand = (value: string) => {
    if (!value) {
      return [];
    }

    const groups = value.split(":");
    const last = groups.at(-1);

    if (last?.includes(".")) {
      const ipv4Parts = last.split(".").map(Number);

      if (
        ipv4Parts.length !== 4 ||
        ipv4Parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
      ) {
        return null;
      }

      groups.splice(-1, 1, ((ipv4Parts[0] << 8) | ipv4Parts[1]).toString(16), ((ipv4Parts[2] << 8) | ipv4Parts[3]).toString(16));
    }

    if (groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) {
      return null;
    }

    return groups;
  };

  const left = expand(pieces[0]);
  const right = pieces.length === 2 ? expand(pieces[1]) : [];

  if (!left || !right || (pieces.length === 1 && left.length !== 8)) {
    return null;
  }

  const missing = 8 - left.length - right.length;

  if (missing < 0 || (pieces.length === 2 && missing < 1)) {
    return null;
  }

  const groups = [...left, ...Array.from({ length: missing }, () => "0"), ...right];

  if (groups.length !== 8) {
    return null;
  }

  return groups.reduce((value, group) => (value << 16n) | BigInt(`0x${group}`), 0n);
}

function isPrivateIpv6(address: string) {
  const value = parseIpv6(address);

  if (value === null) {
    return true;
  }

  const first8 = value >> 120n;
  const first10 = value >> 118n;
  const first16 = value >> 112n;
  const first32 = value >> 96n;
  const mappedIpv4 = value >> 32n === 0xffffn;

  if (mappedIpv4) {
    const ipv4 = Number(value & 0xffffffffn);
    return isPrivateIpv4(
      `${ipv4 >>> 24}.${(ipv4 >>> 16) & 255}.${(ipv4 >>> 8) & 255}.${ipv4 & 255}`
    );
  }

  return (
    value === 0n ||
    value === 1n ||
    first8 === 0xffn ||
    first10 === 0b1111111010n ||
    first10 === 0b1111111011n ||
    first16 === 0xfec0n ||
    (value >> 121n) === 0b1111110n ||
    first32 === 0x20010db8n
  );
}

export function isPublicIpAddress(address: string) {
  const normalized = address.replace(/^\[|\]$/g, "");
  const family = isIP(normalized);

  if (family === 4) {
    return !isPrivateIpv4(normalized);
  }

  if (family === 6) {
    return !isPrivateIpv6(normalized);
  }

  return false;
}

function isLocalHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return normalized === "localhost" || normalized.endsWith(".localhost");
}

export async function assertSafeRemoteHttpUrl(
  input: string | URL,
  options: RemoteUrlOptions = {}
) {
  const url = input instanceof URL ? new URL(input.toString()) : new URL(input);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are allowed.");
  }

  if (url.username || url.password) {
    throw new Error("Remote URLs must not contain credentials.");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");

  if (!hostname || isLocalHostname(hostname)) {
    throw new Error("Remote URL hostname is not allowed.");
  }

  if (isIP(hostname)) {
    if (!isPublicIpAddress(hostname)) {
      throw new Error("Remote URL must resolve to a public IP address.");
    }
  } else {
    const lookup = options.lookup ?? dnsLookup;
    let addresses: LookupAddress[];

    try {
      addresses = await lookup(hostname, { all: true, verbatim: true });
    } catch {
      throw new Error("Remote URL hostname could not be resolved.");
    }

    if (
      addresses.length === 0 ||
      addresses.some(({ address }) => !isPublicIpAddress(address))
    ) {
      throw new Error("Remote URL must resolve only to public IP addresses.");
    }
  }

  url.hash = "";
  return url;
}

function combineAbortSignals(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const onAbort = () => controller.abort(signal?.reason);

  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  }

  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    }
  };
}

function isRedirectStatus(status: number) {
  return [301, 302, 303, 307, 308].includes(status);
}

export async function fetchSafeHtml(
  input: string | URL,
  options: FetchSafeHtmlOptions = {}
) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const abort = combineAbortSignals(options.signal, timeoutMs);

  try {
    let currentUrl = await assertSafeRemoteHttpUrl(input, options);

    for (let redirectCount = 0; ; redirectCount += 1) {
      const response = await fetch(currentUrl, {
        headers: options.headers,
        redirect: "manual",
        signal: abort.signal
      });

      if (isRedirectStatus(response.status)) {
        if (redirectCount >= maxRedirects) {
          throw new Error("Remote URL redirect limit exceeded.");
        }

        const location = response.headers.get("location");

        if (!location) {
          throw new Error("Remote URL redirect is missing a location.");
        }

        currentUrl = await assertSafeRemoteHttpUrl(
          new URL(location, currentUrl),
          options
        );
        continue;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch remote HTML: ${response.status}`);
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

      if (
        !contentType.includes("text/html") &&
        !contentType.includes("application/xhtml+xml")
      ) {
        throw new Error("Remote response is not HTML.");
      }

      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error("Remote HTML response has no body.");
      }

      const decoder = new TextDecoder();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          totalBytes += value.byteLength;

          if (totalBytes > maxBytes) {
            await reader.cancel();
            throw new Error("Remote HTML response exceeded the size limit.");
          }

          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }

      const html = chunks
        .map((chunk, index) => decoder.decode(chunk, { stream: index < chunks.length - 1 }))
        .join("") + decoder.decode();

      return {
        html,
        finalUrl: currentUrl.toString()
      };
    }
  } finally {
    abort.cleanup();
  }
}
