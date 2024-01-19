import parse, { HTMLElement, Node } from "node-html-parser";
import { GenerateFeedDto } from "./app.dto";
import { Feed, Item } from "feed";
import { Inject, Injectable } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

let d3TimeFormat;
//(async () => {
//  d3TimeFormat = await import('d3-time-format');
//})();

const ARTICLE_FETCH_CACHE_TTL = 360000 * 24 * 24; // 24 days (bigger values are cause a 32bit integer overflow)
const FEED_FETCH_CACHE_TTL = 360000 * 24 * 24; // 24 days (bigger values are cause a 32bit integer overflow)

async function fetchCached(cacheManager: Cache, url: string, CACHE_TTL: number): Promise<string> {
	const cacheResp = await cacheManager.get<string>(url);
	if (cacheResp) {
		return cacheResp; // Cache hit
	}

	const resp = await fetch(url);
	const text = await resp.text();

	await cacheManager.set(url, text, CACHE_TTL);

	return text;
}

function parseDate(node: Node, dateFormat?: string): Date {
	const htmlElement = node as HTMLElement;
	if (htmlElement.tagName.toLowerCase() === "time") {
		return new Date(htmlElement.getAttribute("datetime"));
	} else {
		if (dateFormat) {
			return d3TimeFormat.timeParse(dateFormat)(htmlElement.toString());
		} else {
			return new Date(htmlElement.toString());
		}
	}
}

@Injectable()
export class AppService {
	constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

	async generateFeed(query: GenerateFeedDto): Promise<string> {
		const feedUrl = new URL(query["feed-url"]);

		const respText = await fetchCached(this.cacheManager, feedUrl.toString(), FEED_FETCH_CACHE_TTL);
		const root = parse(respText);

		const feed = new Feed({
			title: root.querySelector(query["entry-title-selector"])?.text,
			id: feedUrl.toString(),
			link: feedUrl.toString(),
			copyright: "",
		});

		if (query["feed-category"]) {
			feed.addCategory(query["feed-category"]);
		}

		// We generate a promise for each entry to resolve them in parallel
		const feedEntriesPromises: Promise<Item>[] = [];
		for (const entry of root.querySelectorAll(query["feed-entry-selector"])) {
			feedEntriesPromises.push(
				new Promise(async (resolve) => {
					const feedEntry: Item = {
						title: entry.querySelector(query["entry-title-selector"])?.text,
						id: entry.querySelector(query["entry-link-selector"])?.getAttribute("href"),
						link: entry.querySelector(query["entry-link-selector"])?.getAttribute("href"),
						description: entry.querySelector(query["entry-description-selector"])?.text,
						image: entry.querySelector(query["entry-image-selector"])?.getAttribute("src"),
						author: [{ name: entry.querySelector(query["entry-author-selector"])?.text }],
						category: [{ name: entry.querySelector(query["entry-category-selector"])?.text }],
						published: parseDate(entry.querySelector(query["entry-published-selector"]), query["entry-published-format"]),
						date: parseDate(entry.querySelector(query["entry-updated-selector"]), query["entry-updated-format"]),
					};

					if (query["entry-fetch-content"]) {
						const entryContent = await fetchCached(this.cacheManager, feedEntry.link, ARTICLE_FETCH_CACHE_TTL);

						if (query["entry-content-selector"]) {
							feedEntry.content = parse(entryContent).querySelector(query["entry-content-selector"])?.toString();
						} else {
							feedEntry.content = entryContent;
						}
					}

					resolve(feedEntry);
				})
			);
		}

		for (const feedEntry of await Promise.all(feedEntriesPromises)) {
			feed.addItem(feedEntry);
		}

		const atomFeed = feed.atom1();

		return atomFeed;
	}
}
