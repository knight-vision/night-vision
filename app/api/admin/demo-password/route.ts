import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  const { data } = await supabase.from("admin_settings").select("value").eq("key", "demo_password").single();
  return NextResponse.json({ password: data?.value || "nightvision-demo" });
}

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!password || password.length < 4) return NextResponse.json({ error: "4文字以上で入力してください" }, { status: 400 });
  const { error } = await supabase.from("admin_settings").upsert({ key: "demo_password", value: password });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
