export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(val) {
  if (val === undefined || val === null || isNaN(val)) return "0%";
  return `${val.toFixed(1)}%`;
}

export const CATEGORY_COLORS = {
  Food: "#f97316",         // Orange
  Transportation: "#06b6d4", // Cyan
  Groceries: "#10b981",     // Emerald
  Shopping: "#ec4899",      // Pink
  Entertainment: "#8b5cf6", // Purple
  Utilities: "#eab308",     // Amber
  Healthcare: "#ef4444",    // Red
  Education: "#3b82f6",     // Blue
  Miscellaneous: "#64748b", // Slate
};

export function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || "#64748b";
}
