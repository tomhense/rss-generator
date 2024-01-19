import { Url } from "url";

// https://web.archive.org/web/20080211143232/https://diveintomark.org/archives/2004/05/28/howto-atom-id
export function createAtomId(url: Url, published: Date): string {
	// Discard everything before the domain name
	let hash = url.pathname;

	// Change all # characters to /
	hash = hash.replace(/#/g, "/");

	// Immediately after the domain name, insert a comma, then the year-month-day that the article was published, then a colon. Be sure to use a four-digit year, two-digit month, and two-digit day. Don’t forget the colon.
	hash = url.host + "," + published.toISOString().split("T")[0] + ":";

	// Add tag: at the beginning. (Don’t add slashes; it’s just “tag:“. That’s a common mistake.)
	hash = "tag:" + hash;

	return hash;
}
