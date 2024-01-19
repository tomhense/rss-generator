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
	if (!resp.ok) {
		console.error("Failed to fetch RSS feed", resp);
		return;
	}

	const dom = new window.DOMParser().parseFromString(await resp.text(), "text/xml");
	const items = dom.querySelectorAll("entry");

	console.log(dom);
	console.log(items);

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

document.getElementById("try-button").addEventListener("click", () => {
	const form = document.getElementById("form");
	const formData = new FormData(form);
	const search = new URLSearchParams(formData);
	fetchRss("/api/generatefeed?" + search.toString());
});

function onFormUpdate() {
	const formData = new FormData(form);
	const search = new URLSearchParams(formData);
	window.history.replaceState(null, null, "?" + search.toString());

	const feedUrl = new URL("/api/generatefeed", window.location.origin);
	feedUrl.search = search;

	const urlDisplay = document.getElementById("form-url-display");
	urlDisplay.textContent = feedUrl;
	urlDisplay.href = feedUrl;
}

// Handle changes to the form
const form = document.getElementById("form");
form.addEventListener("change", onFormUpdate);

document.getElementById("parse-url-button").addEventListener("click", () => {
	const feedUrl = new URL(document.getElementById("form-url-input").value);
	const form = document.getElementById("form");

	// Fill in the form with the URL's query params
	for (const [key, value] of feedUrl.searchParams.entries()) {
		form.elements[key].value = value;
	}

	onFormUpdate();
});
