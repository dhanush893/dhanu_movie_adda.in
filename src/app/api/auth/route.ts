import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, User, session, setSession, clearSession, isAdminEmail, apiError } from "@/lib/server";
const schema = z.object({ action: z.enum(["register", "login", "logout"]), name: z.string().trim().min(2).max(80).optional(), email: z.string().trim().email().max(254), password: z.string().min(8).max(128) });
export async function GET() {
  const current = await session();
  return Response.json({ user: current ? { id: current.id, name: current.name, email: current.email, role: current.role } : null });
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body?.action === "logout") { await clearSession(); return Response.json({ success: true }); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Invalid request." }, { status: 400 });
    const { action, email, password, name } = parsed.data;
    await db();
    const normalized = email.toLowerCase();
    if (action === "register") {
      if (!name) return Response.json({ error: "Name is required." }, { status: 400 });
      if (await User.exists({ email: normalized })) return Response.json({ error: "An account with this email already exists." }, { status: 409 });
      const passwordHash = await bcrypt.hash(password, 12);
      const role = isAdminEmail(normalized) ? "admin" : "user";
      const user = await User.create({ name, email: normalized, passwordHash, role });
      const safeUser = { id: String(user._id), name: user.name, email: user.email, role: user.role as "user" | "admin" };
      await setSession(safeUser);
      return Response.json({ user: safeUser }, { status: 201 });
    }
    const user = await User.findOne({ email: normalized }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
    const safeUser = { id: String(user._id), name: user.name, email: user.email, role: user.role as "user" | "admin" };
    await setSession(safeUser);
    return Response.json({ user: safeUser });
  } catch (error) { return apiError(error); }
}
