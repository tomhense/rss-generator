import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { AppController } from "./app.controller";
import { CacheModule } from "@nestjs/cache-manager";

@Module({
	imports: [
		ServeStaticModule.forRoot({
			rootPath: join(__dirname, "..", "client"),
			serveRoot: "/",
			exclude: ["/api/(.*)"],
		}),
		CacheModule.register(),
	],
	controllers: [AppController],
})
export class AppModule {}
