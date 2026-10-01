import test from "node:test";
import assert from "node:assert/strict";
import { isPrivatePath, PRIVATE_PATH_PREFIXES } from "../src/lib/private-paths.ts";

test("lists exactly the spec prefixes", () => {
	assert.deepEqual([...PRIVATE_PATH_PREFIXES], [
		"/login", "/dashboard", "/orders", "/payment", "/checkout", "/maintenance", "/admin", "/api",
	]);
});

test("matches the prefix itself and its children", () => {
	for (const p of ["/login", "/orders", "/orders/abc", "/payment/success/1", "/api/orders/create", "/admin/orders/9", "/checkout/process", "/maintenance"]) {
		assert.equal(isPrivatePath(p), true, p);
	}
});

test("does not match look-alike public paths", () => {
	for (const p of ["/", "/privacy", "/terms", "/beasiswa-saudi", "/llms.txt", "/orders-archive", "/loginx", "/apiary", "/administrator"]) {
		assert.equal(isPrivatePath(p), false, p);
	}
});
