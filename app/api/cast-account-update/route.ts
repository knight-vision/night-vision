import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// PUT: メールアドレスまたはパスワードを変更
export async function PUT(req: NextRequest) {
  const { cast_id, email, new_password, current_password } = await req.json();
  if (!cast_id) return NextResponse.json({ error: "cast_idが必要です" }, { status: 400 });

  // 現在のアカウントを確認
  const { data: account, error: fetchErr } = await supabase
    .from("cast_accounts")
    .select("id, email, password_hash")
    .eq("cast_id", Number(cast_id))
    .single();

  if (fetchErr || !account) return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });

  // パスワード変更の場合は現在パスワードを確認
  if (new_password) {
    if (account.password_hash !== current_password) {
      return NextResponse.json({ error: "現在のパスワードが正しくありません" }, { status: 401 });
    }
    const { error } = await supabase
      .from("cast_accounts")
      .update({ password_hash: new_password })
      .eq("cast_id", Number(cast_id));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, type: "password" });
  }

  // メール変更
  if (email) {
    const { error } = await supabase
      .from("cast_accounts")
      .update({ email: email.toLowerCase().trim() })
      .eq("cast_id", Number(cast_id));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    localStorage_update: {
      // フロントで localStorage を更新してもらう
    }
    return NextResponse.json({ success: true, type: "email", new_email: email.toLowerCase().trim() });
  }

  return NextResponse.json({ error: "変更内容がありません" }, { status: 400 });
}

// オーナーがキャストアカウントのメールを変更（cast_idとshop_idで認証）
export async function PATCH(req: NextRequest) {
  const { cast_id, shop_id, new_email } = await req.json();
  if (!cast_id || !shop_id || !new_email) {
    return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 });
  }

  // キャストがそのshopに所属しているか確認
  const { data: cast } = await supabase
    .from("casts")
    .select("id, name")
    .eq("id", Number(cast_id))
    .eq("shop_id", Number(shop_id))
    .single();

  if (!cast) return NextResponse.json({ error: "キャストが見つかりません" }, { status: 404 });

  const { error } = await supabase
    .from("cast_accounts")
    .update({ email: new_email.toLowerCase().trim() })
    .eq("cast_id", Number(cast_id));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
