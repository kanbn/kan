import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "@kan/shared/env";

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

export function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname === "/forgot-password" &&
    env("NEXT_PUBLIC_DISABLE_EMAIL")?.toLowerCase() === "true"
  ) {
    return NextResponse.redirect(resolveLoginUrl(request));
  }

  if (request.nextUrl.pathname === "/") {
    if (env("NEXT_PUBLIC_KAN_ENV") !== "cloud") {
      return NextResponse.redirect(resolveLoginUrl(request));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/forgot-password"],
};
