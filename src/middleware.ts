import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 로그인 페이지와 API는 통과
  if (pathname === "/" || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 세션 쿠키 확인
  const session = request.cookies.get("restaurant-session");
  if (!session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
