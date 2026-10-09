import { supabase, isSupabaseConfigured } from "./supabase.js";

const storyGrid = document.querySelector("#story-grid");
const searchInput = document.querySelector("#search-input");
const genreFilter = document.querySelector("#genre-filter");
const resultsCount = document.querySelector("#results-count");
const emptyState = document.querySelector("#empty-state");

let allStories = [];

document.querySelector("#current-year")?.replaceChildren(
  document.createTextNode(String(new Date().getFullYear()))
);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showError(message) {
  console.error("[StoryNest] Could not load stories:", message);

  if (resultsCount) resultsCount.textContent = "Stories could not be loaded.";

  if (emptyState) emptyState.hidden = true;

  if (storyGrid) {
    storyGrid.innerHTML = `
      <div class="empty-state">
        <h3>Stories could not be loaded</h3>
        <p>${escapeHTML(message)}</p>
        <button class="button button-secondary" id="retry-stories"
                type="button">Try again</button>
      </div>
    `;

    document.querySelector("#retry-stories")?.addEventListener(
      "click",
      loadStories
    );
  }
}

async function loadStories() {
  if (!storyGrid || !searchInput || !genreFilter) {
    showError("A required story collection element is missing from this page.");
    return;
  }

  if (!isSupabaseConfigured) {
    showError("Supabase is not configured. Check the URL and publishable key in js/supabase.js.");
    return;
  }

  if (resultsCount) resultsCount.textContent = "Loading stories...";

  try {
    const { data: storiesData, error: storiesError } = await supabase
      .from("stories")
      .select("id, author_id, title, genre, description, cover_url, likes_count, created_at")
      .order("created_at", { ascending: false });

    if (storiesError) throw storiesError;

    const rows = storiesData || [];

    if (!rows.length) {
      allStories = [];
      renderStories();
      return;
    }

    const authorIds = [
      ...new Set(rows.map((story) => story.author_id).filter(Boolean))
    ];

    let profilesById = {};

    if (authorIds.length) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", authorIds);

      if (profilesError) {
        console.warn("Could not load author profiles:", profilesError.message);
      } else {
        profilesById = Object.fromEntries(
          (profiles || []).map((profile) => [profile.id, profile])
        );
      }
    }

    // Use the likes table for current totals where it is readable.
    let likesByStory = {};

    const { data: likesData, error: likesError } = await supabase
      .from("story_likes")
      .select("story_id");

    if (likesError) {
      console.warn("Could not load live like totals:", likesError.message);
    } else {
      for (const like of likesData || []) {
        likesByStory[like.story_id] =
          (likesByStory[like.story_id] || 0) + 1;
      }
    }

    allStories = rows.map((story) => {
      const profile = profilesById[story.author_id];

      return {
        id: story.id,
        title: story.title,
        genre: story.genre || "Other",
        description: story.description || "",
        author:
          profile?.display_name ||
          profile?.username ||
          "StoryNest Reader",
        cover: story.cover_url || "",
        likes: likesError
          ? Number(story.likes_count) || 0
          : likesByStory[story.id] || 0
      };
    });

    renderStories();
  } catch (error) {
    showError(
      error.message ||
      "An unexpected error occurred while loading stories."
    );
  }
}

function renderStories() {
  if (!storyGrid || !searchInput || !genreFilter) return;

  const query = searchInput.value.trim().toLowerCase();
  const genre = genreFilter.value;

  const filteredStories = allStories.filter((story) => {
    const searchableText = [
      story.title,
      story.author,
      story.description,
      story.genre
    ].join(" ").toLowerCase();

    return searchableText.includes(query) &&
      (genre === "All" || story.genre === genre);
  });

  if (resultsCount) {
    resultsCount.textContent =
      `${filteredStories.length} ${filteredStories.length === 1 ? "story" : "stories"} found`;
  }

  storyGrid.innerHTML = filteredStories.map((story) => {
    const id = encodeURIComponent(story.id);
    const title = escapeHTML(story.title);
    const cover = story.cover
      ? `<img class="story-cover"
               src="${escapeHTML(story.cover)}"
               alt="Cover for ${title}"
               loading="lazy">`
      : `<div class="story-cover story-cover-placeholder"
              role="img" aria-label="No cover image available">
           <span>StoryNest</span>
         </div>`;

    return `
      <article class="story-card">
        <a class="cover-link" href="story.html?id=${id}"
           aria-label="Read ${title}">
          ${cover}
        </a>
        <div class="story-card-body">
          <span class="genre-tag">${escapeHTML(story.genre)}</span>
          <h3><a href="story.html?id=${id}">${title}</a></h3>
          <p class="story-author">By ${escapeHTML(story.author)}</p>
          <p class="story-description">${escapeHTML(story.description)}</p>
          <div class="story-card-footer">
            <span class="like-count">♡ ${Number(story.likes) || 0}</span>
            <a class="read-link" href="story.html?id=${id}">Read story →</a>
          </div>
        </div>
      </article>
    `;
  }).join("");

  if (emptyState) {
    emptyState.hidden = filteredStories.length > 0;
    emptyState.textContent = allStories.length
      ? "No stories match your search. Try another keyword or genre."
      : "No stories have been published yet. Be the first to share one!";
  }
}

searchInput?.addEventListener("input", renderStories);
genreFilter?.addEventListener("change", renderStories);

loadStories();
