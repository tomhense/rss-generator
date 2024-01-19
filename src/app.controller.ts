import { Controller, Get, Query } from "@nestjs/common";
import { GenerateFeed } from "./app.dto";

@Controller()
export class AppController {
	@Get("api/generatefeed")
	async generateFeed(@Query() query: GenerateFeed): Promise<string> {
		return this.generateFeed(query);
	}
}
