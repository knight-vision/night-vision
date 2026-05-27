// プラン定数と機能フラグの一元管理

export type PlanKey = "free" | "light" | "standard" | "premium" | "pro" | "gold";

// 売上管理が使えるプラン（スタンダード以上 or プロ）
export const canUseSales = (plan: string) =>
  ["standard", "pro", "gold"].includes(plan);

// 集客機能が使えるプラン（プレミアム以上 or プロ）
export const canUsePremium = (plan: string) =>
  ["premium", "pro"].includes(plan);

// 求人が使えるプラン（プレミアム以上 or ゴールド or プロ）
export const canUseJobs = (plan: string) =>
  ["premium", "pro", "gold"].includes(plan);

// シフト管理が使えるプラン（全プラン）
export const canUseShift = (_plan: string) => true;

// プラン表示名
export const PLAN_LABELS: Record<string, string> = {
  free:     "🆓 フリープラン",
  light:    "⭐ ライトプラン",
  standard: "🌙 スタンダードプラン",
  premium:  "💡 プレミアムプラン",
  pro:      "🌃 プロプラン",
  gold:     "💎 ゴールドプラン", // 旧プラン互換
};

// プラン料金
export const PLAN_PRICES: Record<string, number> = {
  free: 0,
  light: 0,
  standard: 3000,
  premium: 5000,
  pro: 8000,
  gold: 3000,
};
