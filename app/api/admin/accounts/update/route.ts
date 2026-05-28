export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const { id, account_type, email, password } = await req.json();
  const table = account_type === "owner" ? "shop_owners" : "cast_accounts";
  const update: any = {};
  if (email) update.email = email.toLowerCase();
  if (password) update.password_hash = await bcrypt.hash(password, 10);
  if (Object.keys(update).length === 0) return NextResponse.json({ error: "更新項目なし" }, { status: 400 });
  const { error } = await supabase.from(table).update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
