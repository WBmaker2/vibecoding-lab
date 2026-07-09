import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/auth/session";

const DEFAULT_GITHUB_OWNER = "WBmaker2";
const DEFAULT_GITHUB_REPO = "vibecoding-lab";
const DEFAULT_WORKFLOW_ID = "sync-static-gallery.yml";
const DEFAULT_SYNC_REF = "codex/hongs-vibe-coding-lab";
const DEFAULT_BASE_URL = "https://www.vivehong.shop";

function getConfig() {
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

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = getConfig();

  if (!config.token) {
    return NextResponse.json(
      {
        error:
          "GitHub workflow dispatch is not configured. Set HVC_SYNC_GITHUB_TOKEN."
      },
      { status: 503 }
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

  return NextResponse.json({
    ok: true,
    message: "Static gallery sync workflow dispatched.",
    workflow: config.workflowId,
    ref: config.ref
  });
}
