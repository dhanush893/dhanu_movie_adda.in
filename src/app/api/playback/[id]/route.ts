import { NextRequest } from "next/server";
import { db, ManagedTitle, session, apiError } from "@/lib/server";
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await session(); if (!user) return Response.json({ error: "Sign in to access playback." }, { status: 401 });
    const { id } = await context.params; const type = request.nextUrl.searchParams.get("type") === "tv" ? "tv" : "movie";
    if (!/^\d+$/.test(id)) return Response.json({ error: "Invalid title ID." }, { status: 400 });
    await db();
    const item = await ManagedTitle.findOne({ tmdbId: Number(id), mediaType: type, published: true, streamAuthorized: true }).select("+streamUrl title");
    if (!item || !item.streamUrl) return Response.json({ error: "No authorized stream is available for this title yet." }, { status: 404 });
    return Response.json({ title: item.title, playbackUrl: item.streamUrl, type: "authorized-source" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
