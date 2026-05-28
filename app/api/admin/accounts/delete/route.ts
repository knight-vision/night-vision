export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const { id, account_type, email } = await req.json();
  if ((!id && !email) || !account_type) {
    return NextResponse.json({ error: "id/emailとaccount_typeが必要です" }, { status: 400 });
  }

  const table = account_type === "owner" ? "shop_owners" : "cast_accounts";

  // emailで削除（型変換の問題を回避）
  let query;
  if (email) {
    query = supabase.from(table).delete().eq("email", email);
  } else {
    // idで試みる（文字列のまま渡す）
    query = supabase.from(table).delete().eq("id", id);
  }

  const { error, count } = await query.select();

  if (error) {
    console.error(`[delete] table=${table} email=${email} id=${id} error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[delete] table=${table} email=${email} id=${id} count=${count}`);

  if (count === 0) {
    return NextResponse.json({ error: "削除対象が見つかりませんでした" }, { status: 404 });
  }

  return NextResponse.json({ success: true, deleted: count });
}
