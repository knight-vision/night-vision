import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 5;

// 試行を記録
export async function recordAttempt(identifier: string) {
  await supabase.from("login_attempts").insert({ identifier });
}

// ブロック中か確認
export async function isBlocked(identifier: string): Promise<{ blocked: boolean; remainingSeconds: number }> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("login_attempts")
    .select("attempted_at")
    .eq("identifier", identifier)
    .gte("attempted_at", since)
    .order("attempted_at", { ascending: true });

  const attempts = data || [];
  if (attempts.length < MAX_ATTEMPTS) return { blocked: false, remainingSeconds: 0 };

  // 最初の試行から5分経過したか
  const oldest = new Date(attempts[0].attempted_at).getTime();
  const unblockAt = oldest + WINDOW_MINUTES * 60 * 1000;
  const now = Date.now();
  if (now >= unblockAt) {
    // 期限切れ → 古いレコードを削除
    await supabase.from("login_attempts").delete().eq("identifier", identifier).lt("attempted_at", new Date(unblockAt).toISOString());
    return { blocked: false, remainingSeconds: 0 };
  }
  return { blocked: true, remainingSeconds: Math.ceil((unblockAt - now) / 1000) };
}

// 成功したらクリア
export async function clearAttempts(identifier: string) {
  await supabase.from("login_attempts").delete().eq("identifier", identifier);
}
