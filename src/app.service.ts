import parse from "node-html-parser";
import { GenerateFeed } from "./app.dto";
import { Feed, Item } from "feed";
import { timeParse } from "d3-time-format";
import { Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";

export class AppService {
	constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

	async generateFeed(query: GenerateFeed): Promise<string> {
		const feedUrl = new URL(query["feed-url"]);

		const cacheResp = await this.cacheManager.get(feedUrl.toString());
		if (cacheResp) {
			return cacheResp; // Cache hit
		}

		const resp = await fetch(query["feed-url"]);
		const root = parse(await resp.text());

		const feed = new Feed({
			title: root.querySelector(query["entry-title-selector"])?.toString(),
			id: feedUrl.toString(),
			link: feedUrl.toString(),
			copyright: "",
		});
		if (query["feed-category"]) {
			feed.addCategory(query["feed-category"]);
		}

		for (const entry of root.querySelectorAll(query["feed-entry-selector"])) {
			const feedEntry: Item = {
				title: entry.querySelector(query["entry-title-selector"])?.toString(),
				id: entry.querySelector(query["entry-link-selector"])?.toString(),
				link: entry.querySelector(query["entry-link-selector"])?.getAttribute("href").toString(),
				description: entry.querySelector(query["entry-description-selector"])?.toString(),
				image: entry.querySelector(query["entry-image-selector"])?.getAttribute("src")?.toString(),
				author: [{ name: entry.querySelector(query["entry-author-selector"])?.toString() }],
				category: [{ name: entry.querySelector(query["entry-category-selector"])?.toString() }],
				published: timeParse(query["entry-published-format"])(entry.querySelector(query["entry-published-selector"])?.toString()),
				date: timeParse(query["entry-date-format"])(entry.querySelector(query["entry-date-selector"])?.toString()),
			};

			if (query["entry-fetch-content"]) {
				const resp = await fetch(feedEntry.link);
				feedEntry.content = await resp.text();
			}

			feed.addItem(feedEntry);
		}

		const atomFeed = feed.atom1();

		await this.cacheManager.set(feedUrl.toString(), atomFeed, process.env.CACHE_TTL);

		return atomFeed;
	}
}
