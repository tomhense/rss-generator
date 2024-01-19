import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	const GLOBAL_PREFIX = process.env.URL_PREFIX || "";
	const PORT = process.env.PORT || 3000;

	if (!process.env.SHARED_SECRET) {
		console.error("SHARED_SECRET environment variable is not set. Exiting.");
		process.exit(1);
	}

	app.setGlobalPrefix(GLOBAL_PREFIX);

	// Enable CORS (ToDo: Remove later)
	app.enableCors({
		origin: "https://erdavis.com/feed/",
		methods: "GET",
		preflightContinue: false,
		optionsSuccessStatus: 204,
	});

	await app.listen(PORT);
	console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
