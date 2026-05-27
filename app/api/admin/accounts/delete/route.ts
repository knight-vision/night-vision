import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const { id, account_type } = await req.json();
  if (!id || !account_type) return NextResponse.json({ error: "id・account_typeが必要です" }, { status: 400 });
  const table = account_type === "owner" ? "shop_owners" : "cast_accounts";
  console.log(`[accounts/delete] table=${table} id=${id}`);
  const { error, count } = await supabase.from(table).delete().eq("id", id).select();
  if (error) {
    console.error("[accounts/delete] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  console.log(`[accounts/delete] deleted count=${count}`);
  return NextResponse.json({ success: true });
}
