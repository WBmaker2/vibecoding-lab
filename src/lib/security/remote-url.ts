import { type LookupAddress } from "node:dns";
import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpRequest, type IncomingHttpHeaders } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_BYTES = 1_048_576;
const DEFAULT_MAX_REDIRECTS = 3;

type LookupFn = (
  hostname: string,
  options: { all: true; verbatim: true }
) => Promise<LookupAddress[]>;

export interface RemoteNetworkBudget {
  remaining: number;
}

interface RemoteUrlOptions {
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

interface ValidatedRemoteUrl {
  address: string;
  family: 4 | 6;
  url: URL;
}

interface RemoteResponse {
  body: Buffer;
  headers: IncomingHttpHeaders;
  statusCode: number;
}

function isInRange(value: number, start: number, end: number) {
  return value >= start && value <= end;
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);

  if (
    parts.length !== 4 ||
    parts.some(
      (part) => !Number.isInteger(part) || part < 0 || part > 255
    )
  ) {
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
    (first === 192 && second === 31 && third === 196) ||
    (first === 192 && second === 52 && third === 193) ||
    (first === 192 && second === 88 && third === 99) ||
    (first === 192 && second === 175 && third === 48) ||
    (first === 192 && second === 168) ||
    (first === 198 && second === 18) ||
    (first === 198 && second === 19) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    isInRange(first, 224, 255)
  );
}

function parseIpv6(address: string) {
  const pieces = address.toLowerCase().split("::");

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
        ipv4Parts.some(
          (part) =>
            !Number.isInteger(part) || part < 0 || part > 255
        )
      ) {
        return null;
      }

      groups.splice(
        -1,
        1,
        ((ipv4Parts[0] << 8) | ipv4Parts[1]).toString(16),
        ((ipv4Parts[2] << 8) | ipv4Parts[3]).toString(16)
      );
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

  const groups = [
    ...left,
    ...Array.from({ length: missing }, () => "0"),
    ...right
  ];

  if (groups.length !== 8) {
    return null;
  }

  return groups.reduce(
    (value, group) => (value << 16n) | BigInt(`0x${group}`),
    0n
  );
}

const SPECIAL_IPV6_PREFIXES: Array<[string, number]> = [
  ["100::", 64],
  ["2001::", 32],
  ["2001:2::", 48],
  ["2001:3::", 32],
  ["2001:4:112::", 48],
  ["2001:10::", 28],
  ["2001:20::", 28],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48]
];

function hasIpv6Prefix(value: bigint, prefix: string, length: number) {
  const parsedPrefix = parseIpv6(prefix);

  if (parsedPrefix === null) {
    return false;
  }

  const shift = BigInt(128 - length);
  return value >> shift === parsedPrefix >> shift;
}

function isPrivateIpv6(address: string) {
  const value = parseIpv6(address);

  if (value === null) {
    return true;
  }

  const first8 = value >> 120n;
  const first10 = value >> 118n;
  const first16 = value >> 112n;
  const mappedIpv4 = value >> 32n === 0xffffn;

  if (mappedIpv4) {
    const ipv4 = Number(value & 0xffffffffn);
    return isPrivateIpv4(
      `${ipv4 >>> 24}.${(ipv4 >>> 16) & 255}.${(ipv4 >>> 8) & 255}.${ipv4 & 255}`
    );
  }

  if (value >> 32n === 0n) {
    return true;
  }

  return (
    value === 0n ||
    value === 1n ||
    first8 === 0xffn ||
    first10 === 0b1111111010n ||
    first10 === 0b1111111011n ||
    first16 === 0xfec0n ||
    (value >> 121n) === 0b1111110n ||
    SPECIAL_IPV6_PREFIXES.some(([prefix, length]) =>
      hasIpv6Prefix(value, prefix, length)
    )
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

function timeoutError() {
  return new Error("Remote request timed out.");
}

function withDeadline<T>(
  operation: Promise<T>,
  deadline: number | undefined,
  signal: AbortSignal | undefined
) {
  if (deadline === undefined && !signal) {
    return operation;
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      signal?.removeEventListener("abort", onAbort);
    };

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      callback();
    };

    const onAbort = () => finish(() => reject(signal?.reason ?? timeoutError()));
    const remaining = deadline === undefined ? undefined : deadline - Date.now();

    if (remaining !== undefined && remaining <= 0) {
      finish(() => reject(timeoutError()));
      return;
    }

    if (remaining !== undefined) {
      timeout = setTimeout(() => finish(() => reject(timeoutError())), remaining);
    }

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    operation.then(
      (value) => finish(() => resolve(value)),
      (error: unknown) => finish(() => reject(error))
    );
  });
}

async function validateRemoteUrl(
  input: string | URL,
  options: RemoteUrlOptions
): Promise<ValidatedRemoteUrl> {
  const url = input instanceof URL ? new URL(input.toString()) : new URL(input);

  if (!["http:", "https:"].includes(url.protocol)) {
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
    const family = isIP(hostname);

    if (!isPublicIpAddress(hostname) || (family !== 4 && family !== 6)) {
      throw new Error("Remote URL must resolve to a public IP address.");
    }

    url.hash = "";
    return { address: hostname, family, url };
  }

  const lookup = options.lookup ?? (dnsLookup as LookupFn);
  const lookupPromise = lookup(hostname, { all: true, verbatim: true });
  const addresses = await withDeadline(
    lookupPromise,
    options.deadline,
    options.signal
  );

  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => !isPublicIpAddress(address))
  ) {
    throw new Error("Remote URL must resolve only to public IP addresses.");
  }

  const firstAddress = addresses[0].address;
  const family = isIP(firstAddress);

  if (family !== 4 && family !== 6) {
    throw new Error("Remote URL hostname resolved to an invalid address.");
  }

  url.hash = "";
  return { address: firstAddress, family, url };
}

export async function assertSafeRemoteHttpUrl(
  input: string | URL,
  options: RemoteUrlOptions = {}
) {
  const validated = await validateRemoteUrl(input, options);
  return validated.url;
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

  const timeout = setTimeout(() => controller.abort(timeoutError()), timeoutMs);

  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    }
  };
}

function toRequestHeaders(headers: HeadersInit | undefined) {
  const blockedHeaders = new Set([
    "connection",
    "host",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "set-cookie",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade"
  ]);
  const values = headers
    ? Object.fromEntries(new Headers(headers).entries())
    : {};

  return {
    ...Object.fromEntries(
      Object.entries(values).filter(([name]) => !blockedHeaders.has(name))
    ),
    "accept-encoding": "identity"
  };
}

function getHeader(headers: IncomingHttpHeaders, name: string) {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function requestPinnedResponse(
  validated: ValidatedRemoteUrl,
  options: {
    deadline: number;
    budget?: RemoteNetworkBudget;
    headers?: HeadersInit;
    maxBytes: number;
    method: "GET" | "HEAD";
    signal: AbortSignal;
  }
) {
  const { address, family, url } = validated;
  const remaining = Math.max(1, options.deadline - Date.now());
  const transport = url.protocol === "https:" ? httpsRequest : httpRequest;
  const hostname = url.hostname.replace(/^\[|\]$/g, "");

  return withDeadline(
    new Promise<RemoteResponse>((resolve, reject) => {
      let settled = false;
      const fail = (error: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        reject(error);
      };

      const requestOptions = {
        headers: toRequestHeaders(options.headers),
        hostname,
        lookup: (
          _hostname: string,
          _lookupOptions: object,
          callback: (error: Error | null, address: string, family: 4 | 6) => void
        ) => callback(null, address, family),
        method: options.method,
        path: `${url.pathname}${url.search}`,
        port: url.port || undefined,
        protocol: url.protocol,
        servername: url.protocol === "https:" ? hostname : undefined,
        signal: options.signal
      };

      if (options.budget) {
        if (
          !Number.isSafeInteger(options.budget.remaining) ||
          options.budget.remaining <= 0
        ) {
          reject(new Error("Remote network budget exhausted."));
          return;
        }

        options.budget.remaining -= 1;
      }

      const request = transport(requestOptions, (response) => {
        const chunks: Buffer[] = [];
        let totalBytes = 0;

        response.on("data", (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          totalBytes += buffer.byteLength;

          if (totalBytes > options.maxBytes) {
            response.destroy();
            request?.destroy();
            fail(new Error("Remote HTML response exceeded the size limit."));
            return;
          }

          chunks.push(buffer);
        });
        response.on("end", () => {
          if (settled) {
            return;
          }

          settled = true;
          resolve({
            body: Buffer.concat(chunks),
            headers: response.headers,
            statusCode: response.statusCode ?? 0
          });
        });
        response.on("error", fail);
      });

      request.once("error", fail);
      request.setTimeout(remaining, () => {
        request?.destroy();
        fail(timeoutError());
      });
      request.end();
    }),
    options.deadline,
    options.signal
  );
}

function isRedirectStatus(status: number) {
  return [301, 302, 303, 307, 308].includes(status);
}

function exactContentType(headers: IncomingHttpHeaders) {
  return getHeader(headers, "content-type")?.split(";", 1)[0]?.trim().toLowerCase();
}

function safeResponseHeaders(headers: IncomingHttpHeaders) {
  const allowedHeaders = new Set([
    "cache-control",
    "content-language",
    "content-type",
    "etag",
    "expires",
    "last-modified",
    "vary"
  ]);
  const result: Record<string, string> = {};

  for (const name of allowedHeaders) {
    const value = getHeader(headers, name);

    if (value) {
      result[name] = value;
    }
  }

  return result;
}

export async function fetchSafeHtml(
  input: string | URL,
  options: FetchSafeHtmlOptions = {}
) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const deadline = options.deadline ?? Date.now() + timeoutMs;
  const abort = combineAbortSignals(
    options.signal,
    Math.max(0, deadline - Date.now())
  );

  try {
    let current = await validateRemoteUrl(input, {
      ...options,
      deadline,
      signal: abort.signal
    });

    for (let redirectCount = 0; ; redirectCount += 1) {
      const response = await requestPinnedResponse(current, {
        budget: options.budget,
        deadline,
        headers: options.headers,
        maxBytes,
        method: "GET",
        signal: abort.signal
      });

      if (isRedirectStatus(response.statusCode)) {
        if (redirectCount >= maxRedirects) {
          throw new Error("Remote URL redirect limit exceeded.");
        }

        const location = getHeader(response.headers, "location");

        if (!location) {
          throw new Error("Remote URL redirect is missing a location.");
        }

        current = await validateRemoteUrl(new URL(location, current.url), {
          ...options,
          deadline,
          signal: abort.signal
        });
        continue;
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(`Failed to fetch remote HTML: ${response.statusCode}`);
      }

      const contentType = exactContentType(response.headers);

      if (contentType !== "text/html" && contentType !== "application/xhtml+xml") {
        throw new Error("Remote response is not HTML.");
      }

      return {
        finalUrl: current.url.toString(),
        html: new TextDecoder().decode(response.body)
      };
    }
  } finally {
    abort.cleanup();
  }
}

export async function fetchSafeResource(
  input: string | URL,
  options: FetchSafeResourceOptions
): Promise<SafeResourceResponse> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? 512 * 1024;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const deadline = options.deadline ?? Date.now() + timeoutMs;
  const abort = combineAbortSignals(
    options.signal,
    Math.max(0, deadline - Date.now())
  );

  try {
    let current = await validateRemoteUrl(input, {
      ...options,
      deadline,
      signal: abort.signal
    });

    for (let redirectCount = 0; ; redirectCount += 1) {
      const response = await requestPinnedResponse(current, {
        budget: options.budget,
        deadline,
        headers: options.headers,
        maxBytes,
        method: options.method,
        signal: abort.signal
      });

      if (isRedirectStatus(response.statusCode)) {
        if (redirectCount >= maxRedirects) {
          throw new Error("Remote URL redirect limit exceeded.");
        }

        const location = getHeader(response.headers, "location");

        if (!location) {
          throw new Error("Remote URL redirect is missing a location.");
        }

        current = await validateRemoteUrl(new URL(location, current.url), {
          ...options,
          deadline,
          signal: abort.signal
        });
        continue;
      }

      return {
        body: response.body,
        finalUrl: current.url.toString(),
        headers: safeResponseHeaders(response.headers),
        statusCode: response.statusCode
      };
    }
  } finally {
    abort.cleanup();
  }
}
