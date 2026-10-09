import { stories } from "./stories.js";

const storyGrid = document.querySelector("#story-grid");
const searchInput = document.querySelector("#search-input");
const genreFilter = document.querySelector("#genre-filter");
const resultsCount = document.querySelector("#results-count");
const emptyState = document.querySelector("#empty-state");

function renderStories() {
const query = searchInput.value.trim().toLowerCase();
const genre = genreFilter.value;

const filteredStories = stories.filter((story) => {
const matchesSearch =
story.title.toLowerCase().includes(query) ||
story.author.toLowerCase().includes(query) ||
story.description.toLowerCase().includes(query);

```
const matchesGenre = genre === "All" || story.genre === genre;
return matchesSearch && matchesGenre;
```

});

resultsCount.textContent = `${filteredStories.length} ${filteredStories.length === 1 ? "story" : "stories"} found`;
emptyState.hidden = filteredStories.length > 0;

storyGrid.innerHTML = filteredStories.map((story) => `     <article class="story-card">       <a class="cover-link" href="story.html?id=${encodeURIComponent(story.id)}" aria-label="Read ${story.title}">         <img class="story-cover" src="${story.cover}" alt="Cover for ${story.title}" loading="lazy">       </a>       <div class="story-card-body">         <span class="genre-tag">${story.genre}</span>         <h3><a href="story.html?id=${encodeURIComponent(story.id)}">${story.title}</a></h3>         <p class="story-author">By ${story.author}</p>         <p class="story-description">${story.description}</p>         <div class="story-card-footer">           <span class="like-count">♡ ${story.likes}</span>           <a class="read-link" href="story.html?id=${encodeURIComponent(story.id)}">Read story →</a>         </div>       </div>     </article>
  `).join("");
}

searchInput.addEventListener("input", renderStories);
genreFilter.addEventListener("change", renderStories);

document.querySelector("#current-year").textContent = new Date().getFullYear();
renderStories();
