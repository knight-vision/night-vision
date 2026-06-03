import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// プッシュトークンを保存
export async function POST(req: NextRequest) {
  const { token, platform, shop_owner_id, cast_account_id } = await req.json();
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  if (shop_owner_id) {
    await supabase.from("shop_owners")
      .update({ push_token: token, push_platform: platform })
      .eq("id", Number(shop_owner_id));
  } else if (cast_account_id) {
    await supabase.from("cast_accounts")
      .update({ push_token: token, push_platform: platform })
      .eq("id", Number(cast_account_id));
  }

  return NextResponse.json({ success: true });
}
