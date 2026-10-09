import { stories } from "./stories.js";
import { getAllStories } from "./storage.js";

const storyGrid = document.querySelector("#story-grid");
const searchInput = document.querySelector("#search-input");
const genreFilter = document.querySelector("#genre-filter");
const resultsCount = document.querySelector("#results-count");
const emptyState = document.querySelector("#empty-state");

function escapeHTML(value) {
return String(value ?? "").replace(/[&<>"']/g, (char) => ({
"&": "&",
"<": "<",
">": ">",
'"': """,
"'": "'"
})[char]);
}

function renderStories() {
const query = searchInput.value.trim().toLowerCase();
const genre = genreFilter.value;

const allStories = getAllStories(stories);

const filteredStories = allStories.filter((story) => {
const searchableText = [
story.title,
story.author,
story.description
].join(" ").toLowerCase();

```
return searchableText.includes(query) &&
  (genre === "All" || story.genre === genre);
```

});

resultsCount.textContent =
`${filteredStories.length} ${filteredStories.length === 1 ? "story" : "stories"} found`;

emptyState.hidden = filteredStories.length > 0;

storyGrid.innerHTML = filteredStories.map((story) => {
const id = encodeURIComponent(story.id);

```
return `
  <article class="story-card">
    <a class="cover-link" href="story.html?id=${id}" aria-label="Read ${escapeHTML(story.title)}">
      <img class="story-cover"
           src="${escapeHTML(story.cover)}"
           alt="Cover for ${escapeHTML(story.title)}"
           loading="lazy">
    </a>
    <div class="story-card-body">
      <span class="genre-tag">${escapeHTML(story.genre)}</span>
      <h3><a href="story.html?id=${id}">${escapeHTML(story.title)}</a></h3>
      <p class="story-author">By ${escapeHTML(story.author)}</p>
      <p class="story-description">${escapeHTML(story.description)}</p>
      <div class="story-card-footer">
        <span class="like-count">♡ ${Number(story.likes) || 0}</span>
        <a class="read-link" href="story.html?id=${id}">Read story →</a>
      </div>
    </div>
  </article>
`;
```

}).join("");
}

searchInput.addEventListener("input", renderStories);
genreFilter.addEventListener("change", renderStories);

document.querySelector("#current-year").textContent = new Date().getFullYear();
renderStories();
