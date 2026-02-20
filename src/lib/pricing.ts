export const BASE_PRICE = 75000;
export const HARD_COPY_FEE = 20000;

export type PricingTier = {
  id: "reguler" | "sedang" | "ekspres" | "kilat";
  label: string;
  description: string;
  days: number;
  price: number;
  color: string; // Tailwind class or hex for UI references
};

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "reguler",
    label: "Reguler",
    description: "Paling Hemat (Recommended)",
    days: 9,
    price: 75000,
    color: "text-green-600",
  },
  {
    id: "sedang",
    label: "Standar",
    description: "Standar",
    days: 5,
    price: 125000,
    color: "text-teal-600",
  },
  {
    id: "ekspres",
    label: "Ekspres",
    description: "Prioritas",
    days: 2,
    price: 165000,
    color: "text-blue-600",
  },
  {
    id: "kilat",
    label: "Kilat",
    description: "Super Urgent",
    days: 1,
    price: 300000,
    color: "text-amber-600",
  },
];

export const getTierByDays = (days: number): PricingTier => {
  // Exact match or closest lower tier (though logic should enforce exact mapping now)
  return PRICING_TIERS.find((t) => t.days === days) || PRICING_TIERS[0];
};

export function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}
