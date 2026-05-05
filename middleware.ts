import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const REALM = 'Basic realm="premura-admin", charset="UTF-8"';

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": REALM },
  });
}

export function middleware(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return new NextResponse(
      "Admin not configured: set ADMIN_PASSWORD in env",
      { status: 503 }
    );
  }

  const header = req.headers.get("authorization");
  if (!header || !header.toLowerCase().startsWith("basic ")) {
    return unauthorized();
  }

  let decoded: string;
  try {
    decoded = atob(header.slice(6).trim());
  } catch {
    return unauthorized();
  }

  const idx = decoded.indexOf(":");
  const pass = idx >= 0 ? decoded.slice(idx + 1) : decoded;
  if (pass !== expected) return unauthorized();

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
