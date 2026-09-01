import { listStaticPublicApps } from "@/lib/apps/static-public-apps";
import { createLlmsText } from "@/lib/seo/llms";

export const dynamic = "force-static";

export function GET() {
  return new Response(createLlmsText(listStaticPublicApps()), {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
