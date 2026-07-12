import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/auth/session";
import { getAppRepository } from "@/lib/apps/repository";
import {
  getStaticGalleryBaseline
} from "@/lib/apps/static-public-apps";
import {
  ACTIVE_WORKFLOW_STATUSES,
  getStaticGallerySyncSummary,
  type StaticGallerySyncRun
} from "@/lib/apps/static-gallery-sync-state";

const DEFAULT_GITHUB_OWNER = "WBmaker2";
const DEFAULT_GITHUB_REPO = "vibecoding-lab";
const DEFAULT_WORKFLOW_ID = "sync-static-gallery.yml";
const DEFAULT_SYNC_REF = "codex/hongs-vibe-coding-lab";
const DEFAULT_BASE_URL = "https://www.vivehong.shop";

interface GitHubConfig {
  token: string | undefined;
  owner: string;
  repo: string;
  workflowId: string;
  ref: string;
  baseUrl: string;
}

function getConfig(): GitHubConfig {
  return {
    token: process.env.HVC_SYNC_GITHUB_TOKEN?.trim(),
    owner: process.env.HVC_SYNC_GITHUB_OWNER?.trim() || DEFAULT_GITHUB_OWNER,
    repo: process.env.HVC_SYNC_GITHUB_REPO?.trim() || DEFAULT_GITHUB_REPO,
    workflowId:
      process.env.HVC_SYNC_GITHUB_WORKFLOW_ID?.trim() || DEFAULT_WORKFLOW_ID,
    ref: process.env.HVC_SYNC_GITHUB_REF?.trim() || DEFAULT_SYNC_REF,
    baseUrl: process.env.HVC_SYNC_BASE_URL?.trim() || DEFAULT_BASE_URL
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeWorkflowRun(value: unknown): StaticGallerySyncRun | null {
  if (!isRecord(value) || typeof value.id !== "number" || !Number.isFinite(value.id)) {
    return null;
  }

  return {
    id: value.id,
    status: stringOrNull(value.status),
    conclusion: stringOrNull(value.conclusion),
    htmlUrl: stringOrNull(value.html_url),
    createdAt: stringOrNull(value.created_at),
    updatedAt: stringOrNull(value.updated_at)
  };
}

function workflowRunsUrl(config: GitHubConfig): string {
  const params = new URLSearchParams({
    branch: config.ref,
    event: "workflow_dispatch",
    per_page: "1"
  });

  return `https://api.github.com/repos/${config.owner}/${config.repo}/actions/workflows/${config.workflowId}/runs?${params.toString()}`;
}

async function getLatestWorkflowRun(
  config: GitHubConfig
): Promise<StaticGallerySyncRun | null> {
  const response = await fetch(workflowRunsUrl(config), {
    method: "GET",
    cache: "no-store",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${config.token}`,
      "x-github-api-version": "2022-11-28"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub workflow status failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as { workflow_runs?: unknown };
  const firstRun = Array.isArray(payload.workflow_runs)
    ? payload.workflow_runs[0]
    : null;

  return normalizeWorkflowRun(firstRun);
}

async function getSyncSummary() {
  const repo = getAppRepository();
  const apps = await repo.listAdminApps();
  return getStaticGallerySyncSummary(apps, getStaticGalleryBaseline());
}

async function getReason(request: Request) {
  try {
    const payload = (await request.json()) as { reason?: unknown };
    return typeof payload.reason === "string" && payload.reason.trim()
      ? payload.reason.trim().slice(0, 120)
      : "admin-button";
  } catch {
    return "admin-button";
  }
}

function configurationError() {
  return NextResponse.json(
    {
      error:
        "GitHub workflow dispatch is not configured. Set HVC_SYNC_GITHUB_TOKEN."
    },
    { status: 503 }
  );
}

function statusError() {
  return NextResponse.json(
    { error: "GitHub Actions 실행 상태를 확인하지 못했습니다." },
    { status: 502 }
  );
}

export async function GET() {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = getConfig();

  if (!config.token) {
    return configurationError();
  }

  try {
    return NextResponse.json({ run: await getLatestWorkflowRun(config) });
  } catch {
    return statusError();
  }
}

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await getSyncSummary();

  if (summary.pendingCount === 0) {
    return NextResponse.json({ dispatched: false });
  }

  const config = getConfig();

  if (!config.token) {
    return configurationError();
  }

  let latestRun: StaticGallerySyncRun | null;

  try {
    latestRun = await getLatestWorkflowRun(config);
  } catch {
    return statusError();
  }

  if (latestRun?.status && ACTIVE_WORKFLOW_STATUSES.has(latestRun.status)) {
    return NextResponse.json(
      {
        error: "이미 실행 중인 동기화 작업이 있습니다.",
        run: latestRun
      },
      { status: 409 }
    );
  }

  const reason = await getReason(request);
  const response = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repo}/actions/workflows/${config.workflowId}/dispatches`,
    {
      method: "POST",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${config.token}`,
        "content-type": "application/json",
        "x-github-api-version": "2022-11-28"
      },
      body: JSON.stringify({
        ref: config.ref,
        inputs: {
          base_url: config.baseUrl,
          reason
        }
      })
    }
  );

  if (!response.ok) {
    return NextResponse.json(
      {
        error: `GitHub workflow dispatch failed with status ${response.status}.`
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ dispatched: true }, { status: 202 });
}
