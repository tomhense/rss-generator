class EntryComponent extends HTMLElement {
	constructor(content) {
		super();
		const template = document.getElementById("entry-component-template");
		const templateContent = template.content.cloneNode(true);

		templateContent.querySelector(".entry-title").textContent = content.title;
		templateContent.querySelector(".entry-description").textContent = content.description;
		templateContent.querySelector(".entry-link").href = content.link;
		templateContent.querySelector(".entry-updated-date").textContent = content.updatedDate ? `Updated on ${content.updatedDate}` : "";
		templateContent.querySelector(".entry-published-date").textContent = content.publishedDate ? `Published on: ${content.publishedDate}` : "";
		templateContent.querySelector(".entry-category").textContent = content.category ? `Category: ${content.category}` : "";
		templateContent.querySelector(".entry-image").src = content.image;
		templateContent.querySelector(".entry-author").textContent = content.author ? `Author: ${content.author}` : "";

		this.append(templateContent);
	}
}

customElements.define("entry-component", EntryComponent);

async function fetchRss(rssUrl) {
	const resp = await fetch(rssUrl);
	const dom = new window.DOMParser().parseFromString(await resp.text(), "text/xml");
	const items = dom.querySelectorAll("item");

	const entryContainer = document.getElementById("feed-preview-container");
	entryContainer.innerHTML = ""; // Clear the container

	for (const item of items) {
		entryContainer.appendChild(
			new EntryComponent({
				title: item.querySelector("title")?.textContent,
				description: item.querySelector("description")?.textContent,
				link: item.querySelector("link")?.textContent,
				updatedDate: item.querySelector("updated")?.textContent,
				publishedDate: item.querySelector("published")?.textContent,
				category: item.querySelector("category")?.textContent,
				image: item.querySelector("image url")?.textContent,
			})
		);
	}
}

document.getElementById("try-button").addEventListener("submit", (e) => {
	const form = document.getElementById("form");
	const formData = new FormData(form);
	const search = new URLSearchParams(formData);
	fetchRss("/api/generatefeed?" + search.toString());
});
