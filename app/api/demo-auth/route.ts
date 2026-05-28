import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!password) return NextResponse.json({ error: "パスワードを入力してください" }, { status: 400 });

  // adminパスワードもデモパスワードも受け付ける
  const [adminRes, demoRes] = await Promise.all([
    supabase.from("admin_settings").select("value").eq("key", "admin_password").single(),
    supabase.from("admin_settings").select("value").eq("key", "demo_password").single(),
  ]);

  const adminPw = adminRes.data?.value;
  const demoPw = demoRes.data?.value || "nightvision-demo";

  if (password === adminPw) return NextResponse.json({ ok: true, role: "admin" });
  if (password === demoPw) return NextResponse.json({ ok: true, role: "demo" });

  return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });
}
