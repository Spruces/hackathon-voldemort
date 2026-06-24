import { NextResponse } from "next/server";
import { getRole } from "@/lib/session";

export async function GET() {
  const role = await getRole();
  if (!role) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, role });
}
