/** Paths that must never be indexed. Single source for the X-Robots-Tag header and the sitemap filter. */
export const PRIVATE_PATH_PREFIXES = [
	"/login",
	"/dashboard",
	"/orders",
	"/payment",
	"/checkout",
	"/maintenance",
	"/admin",
	"/api",
] as const;

export function isPrivatePath(pathname: string): boolean {
	return PRIVATE_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
