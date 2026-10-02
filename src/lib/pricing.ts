export const HARD_COPY_FEE = 20000;

// studyinsaudi.moe.gov.sa application close (end of day, WIB).
export const STUDY_IN_SAUDI_DEADLINE = new Date("2026-10-06T23:59:59+07:00");

export type PricingTier = {
  id: "reguler" | "sedang" | "ekspres" | "kilat";
  label: string;
  description: string;
  days: number;
  price: number;
  /** Closed tiers are shown greyed out and rejected by the order API. */
  open: boolean;
  color: string; // Tailwind class or hex for UI references
};

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "reguler",
    label: "Reguler",
    description: "Ditutup",
    days: 9,
    price: 75000,
    open: false,
    color: "text-green-600",
  },
  {
    id: "sedang",
    label: "Standar",
    description: "Paling Dipilih",
    days: 5,
    price: 99000,
    open: true,
    color: "text-teal-600",
  },
  {
    id: "ekspres",
    label: "Ekspres",
    description: "Prioritas",
    days: 2,
    price: 129000,
    open: true,
    color: "text-blue-600",
  },
  {
    id: "kilat",
    label: "Kilat",
    description: "Super Urgent",
    days: 1,
    price: 199000,
    open: true,
    color: "text-amber-600",
  },
];

export const OPEN_TIERS = PRICING_TIERS.filter((t) => t.open);

/** Pre-selected tier; also the fallback for stale saved state. */
export const DEFAULT_TIER = OPEN_TIERS.find((t) => t.id === "sedang") ?? OPEN_TIERS[0];

/** Cheapest open per-page price, used for "mulai dari" copy and estimates. */
export const BASE_PRICE = Math.min(...OPEN_TIERS.map((t) => t.price));

export const getTierByDays = (days: number): PricingTier => {
  return PRICING_TIERS.find((t) => t.days === days) || DEFAULT_TIER;
};

/** True when work started today would finish after the studyinsaudi close. */
export function missesDeadline(tier: PricingTier, from: Date = new Date()): boolean {
  const done = new Date(from.getTime() + tier.days * 24 * 60 * 60 * 1000);
  return done > STUDY_IN_SAUDI_DEADLINE;
}

/**
 * Single source of truth for an order's price. Used by the cart UI and, more
 * importantly, by the order API so the charged amount never comes from the client.
 */
export function computeOrderPrice(totalPages: number, days: number, hardCopy: boolean): number {
  const tier = getTierByDays(days);
  return Math.round(totalPages * tier.price + (hardCopy ? HARD_COPY_FEE : 0));
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}
