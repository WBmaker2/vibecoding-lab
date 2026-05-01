import { NextResponse } from "next/server";
import { getAppRepository } from "@/lib/apps/repository";
import {
  decodeEmbeddedThumbnailUrl,
  isEmbeddedThumbnailUrl
} from "@/lib/storage/public-thumbnail";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    id: string;
    version: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id, version } = await context.params;
  const repo = getAppRepository();
  const app = await repo.getApp(id);

  if (!app?.thumbnailUrl) {
    return NextResponse.json(
      { message: "Thumbnail not found." },
      { status: 404 }
    );
  }

  if (!isEmbeddedThumbnailUrl(app.thumbnailUrl)) {
    return NextResponse.redirect(app.thumbnailUrl, 307);
  }

  const decoded = decodeEmbeddedThumbnailUrl(app.thumbnailUrl);

  if (!decoded) {
    return NextResponse.json(
      { message: "Thumbnail payload is invalid." },
      { status: 404 }
    );
  }

  return new Response(decoded.buffer, {
    headers: {
      "Content-Type": decoded.contentType,
      "Content-Length": String(decoded.buffer.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: `"${id}-${version}"`
    }
  });
}
