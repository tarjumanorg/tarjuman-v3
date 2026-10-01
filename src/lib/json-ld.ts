/** One JSON-LD document. `<` is escaped so database text can never close the script tag or open a comment. */
export function serializeJsonLd(graph: readonly object[]): string {
	return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}
