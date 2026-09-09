import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env } from "next-runtime-env";

const MCP_HOSTNAMES = new Set(["mcp.kan.bn", "mcp-staging.kan.bn"]);

function resolveLoginUrl(request: NextRequest) {
  const publicBaseUrl = env("NEXT_PUBLIC_BASE_URL");

  if (publicBaseUrl?.length) {
    try {
      return new URL("/login", publicBaseUrl);
    } catch {
      // Runtime-injected values may bypass the build-time environment schema.
    }
  }

  return new URL("/login", request.url);
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0];
  if (request.nextUrl.pathname === "/" && host && MCP_HOSTNAMES.has(host)) {
    const url = request.nextUrl.clone();
    url.pathname = "/api/mcp";
    return NextResponse.rewrite(url);
  }

  if (request.nextUrl.pathname === "/") {
    if (env("NEXT_PUBLIC_KAN_ENV") !== "cloud") {
      return NextResponse.redirect(resolveLoginUrl(request));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
