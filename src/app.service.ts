import parse, { HTMLElement, Node } from "node-html-parser";
import { GenerateFeedDto } from "./app.dto";
import { Feed, Item } from "feed";
import { HttpException, Inject, Injectable } from "@nestjs/common";
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

function parseDate(element: HTMLElement, dateFormat?: string): Date {
	if (!element) {
		return undefined;
	}

	if (element.tagName === "TIME") {
		return new Date(element.getAttribute("datetime"));
	} else {
		if (dateFormat) {
			return d3TimeFormat.timeParse(dateFormat)(element.text);
		} else {
			return new Date(element.text);
		}
	}
}

function transformRelativeUrlsToAbsolute(root: HTMLElement, baseUrl: string) {
	if (!root) {
		return;
	}

	for (const link of root.querySelectorAll("a")) {
		const href = link.getAttribute("href");
		if (href && !href.startsWith("http")) {
			link.setAttribute("href", new URL(href, baseUrl).toString());
		}
	}

	for (const img of root.querySelectorAll("img")) {
		const src = img.getAttribute("src");
		if (src && !src.startsWith("http")) {
			img.setAttribute("src", new URL(src, baseUrl).toString());
		}
	}
}

function makeAbsoluteUrl(url: string, baseUrl: string): string {
	if (!url) {
		return undefined;
	}
	if (!url.startsWith("http")) {
		return new URL(url, baseUrl).toString();
	} else {
		return url;
	}
}

function sanitizeHtml(root: HTMLElement) {
	if (!root) {
		return undefined;
	}

	for (const script of root.querySelectorAll("script")) {
		script.remove();
	}

	for (const style of root.querySelectorAll("style")) {
		style.remove();
	}
}

@Injectable()
export class AppService {
	constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

	async generateFeed(query: GenerateFeedDto): Promise<string> {
		if (query["shared-secret"] !== process.env.SHARED_SECRET) {
			throw new HttpException("Unauthorized", 401);
		}

		const feedUrl = new URL(query["feed-url"]);

		const respText = await fetchCached(this.cacheManager, feedUrl.toString(), FEED_FETCH_CACHE_TTL);
		const root = parse(respText);

		const feed = new Feed({
			title: query["feed-title"],
			id: feedUrl.toString(),
			link: feedUrl.toString(),
			favicon: "https://www.google.com/s2/favicons?domain=" + feedUrl.host,
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
						link: makeAbsoluteUrl(entry.querySelector(query["entry-link-selector"])?.getAttribute("href"), feedUrl.toString()),
						description: entry.querySelector(query["entry-description-selector"])?.text,
						author: [{ name: entry.querySelector(query["entry-author-selector"])?.text }],
						category: [{ name: entry.querySelector(query["entry-category-selector"])?.text }],
						published: parseDate(entry.querySelector(query["entry-published-selector"]), query["entry-published-dateformat"]),
						date: parseDate(entry.querySelector(query["entry-updated-selector"]), query["entry-updated-dateformat"]),
					};
					//image: makeAbsoluteUrl(entry.querySelector(query["entry-image-selector"])?.getAttribute("src"), feedUrl.toString()),

					if (query["entry-fetch-content-type"] === "article") {
						const entryContent = await fetchCached(this.cacheManager, feedEntry.link, ARTICLE_FETCH_CACHE_TTL);

						const contentRoot = parse(entryContent).querySelector(query["entry-content-selector"] || "body");
						if (contentRoot) {
							transformRelativeUrlsToAbsolute(contentRoot, feedEntry.link);
							sanitizeHtml(contentRoot);

							feedEntry.content = contentRoot.toString();
						}
					} else if (query["entry-fetch-content-type"] === "component") {
						const contentComponent = entry.querySelector(query["entry-content-selector"]);
						transformRelativeUrlsToAbsolute(contentComponent, feedEntry.link);
						sanitizeHtml(contentComponent);

						feedEntry.content = contentComponent.toString();
					}

					resolve(feedEntry);
				})
			);
		}

		for (const feedEntry of await Promise.all(feedEntriesPromises)) {
			feed.addItem(feedEntry);
		}

		return feed.atom1();
	}
}
