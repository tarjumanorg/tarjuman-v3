import test from "node:test";
import assert from "node:assert/strict";
import { serializeJsonLd } from "../src/lib/json-ld.ts";

test("wraps nodes in @context and @graph", () => {
	const parsed = JSON.parse(serializeJsonLd([{ "@type": "Thing", name: "a" }]));
	assert.equal(parsed["@context"], "https://schema.org");
	assert.deepEqual(parsed["@graph"], [{ "@type": "Thing", name: "a" }]);
});

test("a hostile string cannot close the script tag or open a comment", () => {
	const hostile = `</script><script>alert(1)</script><!-- & "quote"`;
	const out = serializeJsonLd([{ name: hostile }]);
	assert.equal(out.includes("<"), false);
	assert.equal(JSON.parse(out)["@graph"][0].name, hostile);
});
