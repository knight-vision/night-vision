import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "メールアドレスとパスワードを入力してください" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("shop_owners")
    .select("*, shops(*)")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "メールアドレスまたはパスワードが違います" }, { status: 401 });
  }
  if (data.password_hash !== password) {
    return NextResponse.json({ error: "メールアドレスまたはパスワードが違います" }, { status: 401 });
  }

  const shop = data.shops as any;
  return NextResponse.json({
    role: "owner",
    owner_id: data.id,
    shop_id: data.shop_id,
    shop_name: shop?.name,
    shop_slug: shop?.slug,
    email: data.email,
  });
}
