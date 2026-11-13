import { NextRequest } from "next/server";
import { db, Watchlist, session, apiError } from "@/lib/server";
export async function GET() {
  try {
    const user = await session(); if (!user) return Response.json({ error: "Sign in to view your watchlist." }, { status: 401 });
    await db(); const items = await Watchlist.find({ userId: user.id }).sort({ createdAt: -1 }).lean();
    return Response.json({ items });
  } catch (error) { return apiError(error); }
}
export async function POST(request: NextRequest) {
  try {
    const user = await session(); if (!user) return Response.json({ error: "Sign in to save titles." }, { status: 401 });
    const body = await request.json();
    if (!Number.isInteger(body.tmdbId) || body.tmdbId < 1 || !["movie", "tv"].includes(body.mediaType) || typeof body.title !== "string") return Response.json({ error: "Invalid watchlist entry." }, { status: 400 });
    await db();
    await Watchlist.findOneAndUpdate({ userId: user.id, tmdbId: body.tmdbId, mediaType: body.mediaType }, { $set: { title: body.title.slice(0, 180), posterPath: body.posterPath || null, releaseDate: body.releaseDate || "" } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    return Response.json({ success: true });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: NextRequest) {
  try {
    const user = await session(); if (!user) return Response.json({ error: "Sign in to update your watchlist." }, { status: 401 });
    const body = await request.json(); await db();
    await Watchlist.deleteOne({ userId: user.id, tmdbId: Number(body.tmdbId), mediaType: body.mediaType });
    return Response.json({ success: true });
  } catch (error) { return apiError(error); }
}
