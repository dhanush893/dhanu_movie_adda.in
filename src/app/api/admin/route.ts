import { NextRequest } from "next/server";
import { db, ManagedTitle, adminSession, apiError } from "@/lib/server";
function validHttps(value: unknown) { if (!value) return true; try { return new URL(String(value)).protocol === "https:"; } catch { return false; } }
export async function GET() {
  try { const user = await adminSession(); if (!user) return Response.json({ error: "Administrator access required." }, { status: 403 }); await db(); const items = await ManagedTitle.find({}).select("-streamUrl").sort({ updatedAt: -1 }).lean(); return Response.json({ items }); }
  catch (error) { return apiError(error); }
}
export async function POST(request: NextRequest) {
  try {
    const user = await adminSession(); if (!user) return Response.json({ error: "Administrator access required." }, { status: 403 });
    const body = await request.json();
    if (!Number.isInteger(body.tmdbId) || body.tmdbId < 1 || !["movie", "tv"].includes(body.mediaType) || typeof body.title !== "string" || !body.title.trim()) return Response.json({ error: "TMDB ID, type, and title are required." }, { status: 400 });
    if (!validHttps(body.streamUrl)) return Response.json({ error: "Video source must use HTTPS." }, { status: 400 });
    if (body.streamUrl && body.streamAuthorized !== true) return Response.json({ error: "Confirm distribution authorization before adding a stream." }, { status: 400 });
    await db();
    const item = await ManagedTitle.findOneAndUpdate({ tmdbId: body.tmdbId, mediaType: body.mediaType }, { $set: { title: body.title.trim().slice(0, 180), overview: String(body.overview || "").slice(0, 5000), posterPath: body.posterPath || null, backdropPath: body.backdropPath || null, releaseDate: body.releaseDate || "", streamUrl: body.streamUrl || null, streamAuthorized: Boolean(body.streamUrl && body.streamAuthorized), published: Boolean(body.published), addedBy: user.id } }, { upsert: true, new: true, setDefaultsOnInsert: true }).select("-streamUrl");
    return Response.json({ item }, { status: 201 });
  } catch (error) { return apiError(error); }
}
export async function PATCH(request: NextRequest) {
  try {
    const user = await adminSession(); if (!user) return Response.json({ error: "Administrator access required." }, { status: 403 });
    const body = await request.json(); if (!body.id || !validHttps(body.streamUrl)) return Response.json({ error: "Valid title ID and HTTPS stream URL required." }, { status: 400 });
    if (body.streamUrl && body.streamAuthorized !== true) return Response.json({ error: "Confirm authorization before enabling playback." }, { status: 400 });
    await db(); const item = await ManagedTitle.findByIdAndUpdate(body.id, { $set: { streamUrl: body.streamUrl || null, streamAuthorized: Boolean(body.streamUrl && body.streamAuthorized), published: Boolean(body.published) } }, { new: true }).select("-streamUrl");
    return item ? Response.json({ item }) : Response.json({ error: "Title not found." }, { status: 404 });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: NextRequest) {
  try { const user = await adminSession(); if (!user) return Response.json({ error: "Administrator access required." }, { status: 403 }); const id = request.nextUrl.searchParams.get("id"); if (!id) return Response.json({ error: "Title ID is required." }, { status: 400 }); await db(); await ManagedTitle.findByIdAndDelete(id); return Response.json({ success: true }); }
  catch (error) { return apiError(error); }
}
