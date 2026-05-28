// プラン定数と機能フラグの一元管理

export type PlanKey = "free" | "light" | "standard" | "premium" | "pro";

// gold は旧プラン → standard として扱う
const normalize = (plan: string) => plan === "gold" ? "standard" : plan;

// 売上管理が使えるプラン（スタンダード以上）
export const canUseSales = (plan: string) =>
  ["standard", "premium", "pro"].includes(normalize(plan));

// 集客機能が使えるプラン（プレミアム以上）
export const canUsePremium = (plan: string) =>
  ["premium", "pro"].includes(normalize(plan));

// 求人が使えるプラン（プレミアム以上）
export const canUseJobs = (plan: string) =>
  ["premium", "pro"].includes(normalize(plan));

// シフト管理が使えるプラン（全プラン）
export const canUseShift = (_plan: string) => true;

// プラン表示名
export const PLAN_LABELS: Record<string, string> = {
  free:     "🆓 フリープラン",
  light:    "⭐ ライトプラン",
  standard: "🌙 スタンダードプラン",
  premium:  "💡 プレミアムプラン",
  pro:      "🌃 プロプラン",
};

// プラン料金
export const PLAN_PRICES: Record<string, number> = {
  free: 0,
  light: 0,
  standard: 3000,
  premium: 5000,
  pro: 8000,
};
