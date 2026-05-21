import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function PATCH(req: NextRequest) {
  const { owner_id, new_email } = await req.json();
  if (!owner_id || !new_email) {
    return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });
  }

  // メール重複チェック
  const { data: existing } = await supabase
    .from("shop_owners")
    .select("id")
    .eq("email", new_email.toLowerCase().trim())
    .single();
  if (existing) {
    return NextResponse.json({ error: "このメールアドレスはすでに使用されています" }, { status: 400 });
  }

  const { error } = await supabase
    .from("shop_owners")
    .update({ email: new_email.toLowerCase().trim() })
    .eq("id", Number(owner_id));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
