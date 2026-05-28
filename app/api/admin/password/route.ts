export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// 現在のパスワードを取得
export async function GET() {
  const { data } = await supabase.from("admin_settings").select("value").eq("key", "admin_password").single();
  return NextResponse.json({ password: data?.value || "nightvision2025" });
}

// パスワードを変更
export async function POST(req: NextRequest) {
  const { current, newPassword } = await req.json();
  if (!current || !newPassword) return NextResponse.json({ error: "必須項目不足" }, { status: 400 });
  if (newPassword.length < 6) return NextResponse.json({ error: "6文字以上で入力してください" }, { status: 400 });

  const { data } = await supabase.from("admin_settings").select("value").eq("key", "admin_password").single();
  const currentPw = data?.value || "nightvision2025";
  if (current !== currentPw) return NextResponse.json({ error: "現在のパスワードが違います" }, { status: 401 });

  const { error } = await supabase.from("admin_settings").upsert({ key: "admin_password", value: newPassword });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
