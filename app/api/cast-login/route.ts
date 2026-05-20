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
    .from("cast_accounts")
    .select("*, casts(id, name, shop_id)")
    .eq("email", email)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "メールアドレスまたはパスワードが違います" }, { status: 401 });
  }

  if (data.password_hash !== password) {
    return NextResponse.json({ error: "メールアドレスまたはパスワードが違います" }, { status: 401 });
  }

  return NextResponse.json({
    id: data.id,
    cast_id: data.cast_id,
    cast_name: (data.casts as any)?.name,
    shop_id: (data.casts as any)?.shop_id,
  });
}
