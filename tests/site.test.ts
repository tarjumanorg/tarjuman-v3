import test from "node:test";
import assert from "node:assert/strict";
import {
	canonicalPath, organizationNode, websiteNode, serviceNode, breadcrumbNode, faqNode, articleNode,
	ORG_ID, WEBSITE_ID, SERVICE_ID, SITE, CONTENT_UPDATED,
} from "../src/lib/site.ts";
import { PRICING_TIERS } from "../src/lib/pricing.ts";

test("canonicalPath drops trailing slash, .html, and keeps root", () => {
	assert.equal(canonicalPath("/"), "/");
	assert.equal(canonicalPath("/privacy"), "/privacy");
	assert.equal(canonicalPath("/privacy/"), "/privacy");
	assert.equal(canonicalPath("/privacy.html"), "/privacy");
	assert.equal(canonicalPath("/index.html"), "/");
	assert.equal(canonicalPath("/beasiswa-saudi//"), "/beasiswa-saudi");
});

test("organization has the real logo URL", () => {
	const org = organizationNode();
	assert.equal(org["@id"], ORG_ID);
	assert.equal(org.logo.url, "https://tarjuman.org/icon.png");
	assert.equal(SITE.logo, "https://tarjuman.org/icon.png");
});

test("website references the organization as publisher", () => {
	const site = websiteNode();
	assert.equal(site["@id"], WEBSITE_ID);
	assert.equal(site.publisher["@id"], ORG_ID);
	assert.equal(site.inLanguage, "id");
});

test("service has one IDR offer per pricing tier", () => {
	const svc = serviceNode();
	assert.equal(svc["@id"], SERVICE_ID);
	assert.equal(svc.provider["@id"], ORG_ID);
	assert.equal(svc.offers.length, PRICING_TIERS.length);
	PRICING_TIERS.forEach((tier, i) => {
		assert.equal(svc.offers[i].priceCurrency, "IDR");
		assert.equal(svc.offers[i].price, tier.price);
		assert.equal(svc.offers[i].name, tier.label);
	});
});

test("breadcrumb items are 1-indexed with absolute URLs", () => {
	const crumb = breadcrumbNode([{ name: "Beranda", path: "/" }, { name: "Beasiswa Saudi", path: "/beasiswa-saudi" }]);
	assert.equal(crumb.itemListElement[0].position, 1);
	assert.equal(crumb.itemListElement[1].item, "https://tarjuman.org/beasiswa-saudi");
});

test("faq node maps question and plain-text answer", () => {
	const faq = faqNode([{ question: "Q?", answer: "A." }]);
	assert.equal(faq.mainEntity[0].name, "Q?");
	assert.equal(faq.mainEntity[0].acceptedAnswer.text, "A.");
});

test("article references organization and uses the manual modified date", () => {
	const art = articleNode({ headline: "H", description: "D", datePublished: "2026-02-16" });
	assert.equal(art.publisher["@id"], ORG_ID);
	assert.equal(art.author["@id"], ORG_ID);
	assert.equal(art.dateModified, CONTENT_UPDATED);
	assert.match(CONTENT_UPDATED, /^\d{4}-\d{2}-\d{2}$/);
});
