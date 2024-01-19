import { Controller, Get, Header, Query, UseInterceptors } from "@nestjs/common";
import { GenerateFeedDto } from "./app.dto";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { AppService } from "./app.service";

//const RESPONSE_CACHE_TTL = 1000 * 60 * 60; // 1H
const RESPONSE_CACHE_TTL = 10000;

@Controller()
export class AppController {
	constructor(private appService: AppService) {}

	@UseInterceptors(CacheInterceptor)
	@CacheTTL(RESPONSE_CACHE_TTL)
	@Get("api/generatefeed")
	@Header("Content-Type", "application/xml")
	async generateFeed(@Query() query: GenerateFeedDto): Promise<string> {
		return this.appService.generateFeed(query);
	}
}
