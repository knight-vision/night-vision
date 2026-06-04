import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const { token, platform, shop_owner_id, cast_account_id } = await req.json();
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  let result;
  if (shop_owner_id) {
    // shop_owners.id は数値型
    result = await supabase.from("shop_owners")
      .update({ push_token: token, push_platform: platform })
      .eq("id", Number(shop_owner_id))
      .select();
  } else if (cast_account_id) {
    // cast_accounts.id は UUID型なのでそのまま文字列
    result = await supabase.from("cast_accounts")
      .update({ push_token: token, push_platform: platform })
      .eq("id", String(cast_account_id))
      .select();
  } else {
    return NextResponse.json({ error: "shop_owner_id or cast_account_id required" }, { status: 400 });
  }

  if (result?.error) {
    console.error("[push-token] error:", result.error);
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, updated: result?.data?.length || 0 });
}

export async function GET(req: NextRequest) {
  const shopOwnerId = req.nextUrl.searchParams.get("shop_owner_id");
  const castAccountId = req.nextUrl.searchParams.get("cast_account_id");

  if (shopOwnerId) {
    const { data, error } = await supabase
      .from("shop_owners")
      .select("id, email, push_token, push_platform")
      .eq("id", Number(shopOwnerId))
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
  if (castAccountId) {
    const { data, error } = await supabase
      .from("cast_accounts")
      .select("id, email, push_token, push_platform")
      .eq("id", String(castAccountId))
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
  return NextResponse.json({ error: "id required" }, { status: 400 });
}
