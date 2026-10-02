import test from "node:test";
import assert from "node:assert/strict";
import {
	PRICING_TIERS, OPEN_TIERS, DEFAULT_TIER, BASE_PRICE, HARD_COPY_FEE,
	computeOrderPrice, getTierByDays, missesDeadline, STUDY_IN_SAUDI_DEADLINE,
} from "../src/lib/pricing.ts";

test("Reguler is closed and the other tiers are open", () => {
	assert.equal(PRICING_TIERS.find((t) => t.id === "reguler")?.open, false);
	assert.deepEqual(OPEN_TIERS.map((t) => t.id), ["sedang", "ekspres", "kilat"]);
});

test("open tier prices are the launch prices", () => {
	assert.deepEqual(OPEN_TIERS.map((t) => t.price), [99000, 129000, 199000]);
	assert.equal(BASE_PRICE, 99000);
});

test("default tier is Standar and is open", () => {
	assert.equal(DEFAULT_TIER.id, "sedang");
	assert.equal(DEFAULT_TIER.open, true);
});

test("getTierByDays falls back to the default tier for unknown days", () => {
	assert.equal(getTierByDays(5).id, "sedang");
	assert.equal(getTierByDays(0).id, DEFAULT_TIER.id);
	assert.equal(getTierByDays(7).id, DEFAULT_TIER.id);
});

test("computeOrderPrice multiplies pages by tier price and adds the hard copy fee", () => {
	assert.equal(computeOrderPrice(2, 5, false), 2 * 99000);
	assert.equal(computeOrderPrice(3, 2, false), 3 * 129000);
	assert.equal(computeOrderPrice(1, 1, true), 199000 + HARD_COPY_FEE);
});

test("missesDeadline flags tiers that finish after the studyinsaudi close", () => {
	const oct3 = new Date("2026-10-03T00:00:00+07:00");
	const byId = (id: string) => PRICING_TIERS.find((t) => t.id === id)!;
	assert.equal(missesDeadline(byId("kilat"), oct3), false);
	assert.equal(missesDeadline(byId("ekspres"), oct3), false);
	assert.equal(missesDeadline(byId("sedang"), oct3), true);
	assert.ok(STUDY_IN_SAUDI_DEADLINE > oct3);
});
