import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const castAccountId = req.nextUrl.searchParams.get("cast_account_id");
  if (!castAccountId) return NextResponse.json({ connected: false });
  // idはUUID（文字列）なのでそのまま使う
  const { data } = await supabase.from("cast_accounts").select("line_user_id").eq("id", castAccountId).single();
  return NextResponse.json({ connected: !!data?.line_user_id });
}

export async function DELETE(req: NextRequest) {
  const { cast_account_id } = await req.json();
  // idはUUID（文字列）なのでそのまま使う
  await supabase.from("cast_accounts").update({ line_user_id: null }).eq("id", cast_account_id);
  return NextResponse.json({ success: true });
}
