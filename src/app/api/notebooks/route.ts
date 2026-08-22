import { NextRequest, NextResponse } from "next/server";
import { createNotebook, listNotebooks } from "@/lib/store";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const notebooks = await listNotebooks();
    return NextResponse.json({ notebooks });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { title?: string };
    const notebook = await createNotebook(body.title ?? "");
    return NextResponse.json({ notebook }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
