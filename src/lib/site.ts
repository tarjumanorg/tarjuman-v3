import { OPEN_TIERS } from "./pricing.ts";

export const SITE = {
	name: "Tarjuman",
	url: "https://tarjuman.org",
	logo: "https://tarjuman.org/icon.png",
	ogImage: "https://tarjuman.org/og-image.jpg",
	ogImageWidth: 1200,
	ogImageHeight: 640,
	locale: "id_ID",
} as const;

/** Bump by hand when /beasiswa-saudi content changes materially; there is no database updated_at to derive it from. */
export const CONTENT_UPDATED = "2026-02-16";

export const ORG_ID = `${SITE.url}/#organization`;
export const WEBSITE_ID = `${SITE.url}/#website`;
export const SERVICE_ID = `${SITE.url}/#service`;

/** Prerendered pages see `/privacy/` (or `/privacy.html`) at build time; the canonical is always `/privacy`. */
export function canonicalPath(pathname: string): string {
	const path = pathname.replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, "").replace(/\/+$/, "");
	return path === "" ? "/" : path;
}

export function organizationNode() {
	return {
		"@type": "Organization",
		"@id": ORG_ID,
		name: SITE.name,
		url: SITE.url,
		logo: { "@type": "ImageObject", url: SITE.logo },
	};
}

export function websiteNode() {
	return {
		"@type": "WebSite",
		"@id": WEBSITE_ID,
		name: SITE.name,
		url: SITE.url,
		inLanguage: "id",
		publisher: { "@id": ORG_ID },
	};
}

export function serviceNode() {
	return {
		"@type": "Service",
		"@id": SERVICE_ID,
		serviceType: "Sworn translation",
		name: "Jasa Penerjemah Tersumpah Indonesia-Arab",
		provider: { "@id": ORG_ID },
		areaServed: { "@type": "Country", name: "Indonesia" },
		offers: OPEN_TIERS.map((tier) => ({
			"@type": "Offer",
			name: tier.label,
			description: `${tier.days} hari kerja, harga per halaman`,
			price: tier.price,
			priceCurrency: "IDR",
			priceSpecification: {
				"@type": "UnitPriceSpecification",
				price: tier.price,
				priceCurrency: "IDR",
				unitText: "halaman",
			},
		})),
	};
}

export function breadcrumbNode(items: { name: string; path: string }[]) {
	return {
		"@type": "BreadcrumbList",
		itemListElement: items.map((item, i) => ({
			"@type": "ListItem",
			position: i + 1,
			name: item.name,
			item: `${SITE.url}${item.path}`,
		})),
	};
}

export function faqNode(items: { question: string; answer: string }[]) {
	return {
		"@type": "FAQPage",
		mainEntity: items.map((item) => ({
			"@type": "Question",
			name: item.question,
			acceptedAnswer: { "@type": "Answer", text: item.answer },
		})),
	};
}

export function articleNode(input: { headline: string; description: string; datePublished: string }) {
	return {
		"@type": "Article",
		headline: input.headline,
		description: input.description,
		image: SITE.ogImage,
		author: { "@id": ORG_ID },
		publisher: { "@id": ORG_ID },
		datePublished: input.datePublished,
		dateModified: CONTENT_UPDATED,
	};
}

export function whatsappShareUrl(path = "/") {
	const text = `Butuh terjemah tersumpah Indonesia-Arab untuk beasiswa Study in Saudi? Cek Tarjuman: ${SITE.url}${path}`;
	return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
