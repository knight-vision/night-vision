import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email param required" });

  const { data, error } = await supabase
    .from("shop_owners")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error) return NextResponse.json({ error: error.message });

  const keys = Object.keys(data || {});
  const pwKeys = keys.filter(k => k.toLowerCase().includes("pass") || k.toLowerCase().includes("hash"));
  const result: any = { id: data?.id, email: data?.email, shop_id: data?.shop_id, all_keys: keys, pw_keys: pwKeys };
  pwKeys.forEach(k => { result[k + "_prefix"] = String(data[k] || "").slice(0, 15) || "(empty)"; });
  return NextResponse.json(result);
}
