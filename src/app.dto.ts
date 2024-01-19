export interface GenerateFeedDto {
	"feed-url": string;
	"feed-title": string;
	"feed-entry-selector": string;
	"feed-category": string;
	"entry-title-selecor": string;
	"entry-link-selector": string;
	"entry-description-selector": string;
	"entry-image-selector": string;
	"entry-updated-selector": string;
	"entry-updated-dateformat": string;
	"entry-published-selector": string;
	"entry-published-dateformat": string;
	"entry-author-selector": string;
	"entry-category-selector": string;
	"entry-fetch-content": boolean;
	"entry-content-selector": string;
}
