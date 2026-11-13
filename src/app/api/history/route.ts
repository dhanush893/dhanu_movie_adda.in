import { NextRequest } from "next/server";
import { db, WatchHistory, session, apiError } from "@/lib/server";
export async function GET() {
  try { const user = await session(); if (!user) return Response.json({ items: [] }); await db(); const items = await WatchHistory.find({ userId: user.id, completed: false }).sort({ updatedAt: -1 }).limit(20).lean(); return Response.json({ items }); }
  catch (error) { return apiError(error); }
}
export async function POST(request: NextRequest) {
  try {
    const user = await session(); if (!user) return Response.json({ error: "Sign in to save playback progress." }, { status: 401 });
    const body = await request.json();
    if (!Number.isInteger(body.tmdbId) || !["movie", "tv"].includes(body.mediaType)) return Response.json({ error: "Invalid viewing entry." }, { status: 400 });
    const position = Math.max(0, Math.min(Number(body.position) || 0, 86400 * 20));
    const duration = Math.max(0, Math.min(Number(body.duration) || 0, 86400 * 20));
    await db();
    await WatchHistory.findOneAndUpdate({ userId: user.id, tmdbId: body.tmdbId, mediaType: body.mediaType }, { $set: { title: String(body.title || "").slice(0, 180), posterPath: body.posterPath || null, position, duration, completed: duration > 0 && position / duration > 0.95 } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    return Response.json({ success: true });
  } catch (error) { return apiError(error); }
}
