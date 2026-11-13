import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

let cached: Promise<typeof mongoose> | null = null;
export async function db() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured.");
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!cached) cached = mongoose.connect(process.env.MONGODB_URI, { maxPoolSize: 10, bufferCommands: false });
  try { return await cached; } catch (error) { cached = null; throw error; }
}

const UserSchema = new Schema({ name: { type: String, required: true, trim: true, maxlength: 80 }, email: { type: String, required: true, unique: true, lowercase: true, trim: true }, passwordHash: { type: String, required: true, select: false }, role: { type: String, enum: ["user", "admin"], default: "user" } }, { timestamps: true });
const ListSchema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }, tmdbId: { type: Number, required: true }, mediaType: { type: String, enum: ["movie", "tv"], required: true }, title: { type: String, required: true }, posterPath: String, releaseDate: String }, { timestamps: true });
ListSchema.index({ userId: 1, tmdbId: 1, mediaType: 1 }, { unique: true });
const HistorySchema = new Schema({ userId: { type: Schema.Types.ObjectId, required: true, index: true }, tmdbId: { type: Number, required: true }, mediaType: { type: String, enum: ["movie", "tv"], required: true }, title: String, posterPath: String, position: { type: Number, min: 0, default: 0 }, duration: { type: Number, min: 0, default: 0 }, completed: { type: Boolean, default: false } }, { timestamps: true });
HistorySchema.index({ userId: 1, tmdbId: 1, mediaType: 1 }, { unique: true });
const ManagedSchema = new Schema({ tmdbId: { type: Number, required: true }, mediaType: { type: String, enum: ["movie", "tv"], required: true }, title: { type: String, required: true }, overview: String, posterPath: String, backdropPath: String, releaseDate: String, streamUrl: { type: String, select: false }, streamAuthorized: { type: Boolean, default: false }, published: { type: Boolean, default: false }, addedBy: { type: Schema.Types.ObjectId, required: true } }, { timestamps: true });
ManagedSchema.index({ tmdbId: 1, mediaType: 1 }, { unique: true });
export const User = mongoose.models.DhanuUser || mongoose.model("DhanuUser", UserSchema);
export const Watchlist = mongoose.models.DhanuWatchlist || mongoose.model("DhanuWatchlist", ListSchema);
export const WatchHistory = mongoose.models.DhanuHistory || mongoose.model("DhanuHistory", HistorySchema);
export const ManagedTitle = mongoose.models.DhanuManagedTitle || mongoose.model("DhanuManagedTitle", ManagedSchema);

function sessionSecret() {
  const value = process.env.SESSION_SECRET || "";
  if (value.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters.");
  return new TextEncoder().encode(value);
}
export type SessionUser = { id: string; name: string; email: string; role: "user" | "admin" };
export async function setSession(user: SessionUser) {
  const token = await new SignJWT({ name: user.name, email: user.email, role: user.role }).setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt().setExpirationTime("7d").sign(sessionSecret());
  const jar = await cookies();
  jar.set("dhanu_stream_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 604800 });
}
export async function clearSession() { const jar = await cookies(); jar.delete("dhanu_stream_session"); }
export async function session(): Promise<SessionUser | null> {
  try {
    const token = (await cookies()).get("dhanu_stream_session")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, sessionSecret());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return { id: payload.sub, email: payload.email, name: typeof payload.name === "string" ? payload.name : "Member", role: payload.role === "admin" ? "admin" : "user" };
  } catch { return null; }
}
export async function adminSession() {
  const user = await session();
  if (!user || user.role !== "admin") return null;
  await db();
  const stored = await User.findById(user.id).select("_id role").lean();
  return stored && stored.role === "admin" ? user : null;
}
export const isAdminEmail = (email: string) => (process.env.ADMIN_EMAILS || "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());

export class CatalogError extends Error { status: number; constructor(message: string, status = 502) { super(message); this.status = status; } }
export async function tmdb<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const token = process.env.TMDB_ACCESS_TOKEN;
  const key = process.env.TMDB_API_KEY;
  if (!token && !key) throw new CatalogError("TMDB is not configured. Add TMDB_ACCESS_TOKEN or TMDB_API_KEY in the server environment.", 503);
  const url = new URL("https://api.themoviedb.org/3" + path);
  Object.entries(params).forEach(([name, value]) => { if (value !== undefined && value !== "") url.searchParams.set(name, String(value)); });
  if (!token && key) url.searchParams.set("api_key", key);
  const response = await fetch(url, { headers: token ? { Authorization: "Bearer " + token, accept: "application/json" } : { accept: "application/json" }, next: { revalidate: 300 } });
  if (!response.ok) throw new CatalogError("TMDB request failed with status " + response.status + ".", response.status);
  return response.json() as Promise<T>;
}
export function apiError(error: unknown) {
  console.error("[DHANU STREAM]", error);
  if (error instanceof CatalogError) return Response.json({ error: error.message }, { status: error.status });
  return Response.json({ error: "Something went wrong. Check the server configuration and try again." }, { status: 500 });
}
