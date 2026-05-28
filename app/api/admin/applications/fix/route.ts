export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// 申請のstatusをshop_ownersの存在に基づいて自動修正
export async function POST() {
  const { data: apps } = await supabase
    .from("owner_applications")
    .select("id, email, status")
    .eq("status", "pending");

  if (!apps || apps.length === 0) return NextResponse.json({ fixed: 0, message: "修正対象なし" });

  let fixed = 0;
  for (const app of apps) {
    const { data: owner } = await supabase
      .from("shop_owners")
      .select("id")
      .eq("email", app.email)
      .single();

    if (owner) {
      // shop_ownersに存在するのにpendingになっている → approvedに修正
      await supabase.from("owner_applications").update({ status: "approved" }).eq("id", app.id);
      fixed++;
      console.log(`[fix] ${app.email} → approved`);
    }
  }

  return NextResponse.json({ fixed, message: `${fixed}件を承認済みに修正しました` });
}
