import { stories } from "./stories.js";
import {
  getAllStories,
  getLikedStories,
  toggleLike,
  getComments,
  addComment,
  getFavorites,
  toggleFavorite
} from "./storage.js";

const storyContent = document.querySelector("#story-content");
const commentForm = document.querySelector("#comment-form");
const commentsList = document.querySelector("#comments-list");
const commentCount = document.querySelector("#comment-count");
const storyId = new URLSearchParams(window.location.search).get("id");

document.querySelector("#current-year").textContent =
  new Date().getFullYear();

const story = getAllStories(stories).find((item) => item.id === storyId);

if (!story) {
  storyContent.innerHTML = `
    <div class="not-found">
      <h1>Story not found</h1>
      <p>This story may have been removed or the link is incorrect.</p>
      <a class="button button-primary" href="index.html">Explore stories</a>
    </div>
  `;
  commentForm.hidden = true;
} else {
  document.title = `${story.title} | StoryNest`;
  renderStory();
  renderComments();

  storyContent.addEventListener("click", (event) => {
    if (event.target.closest("#like-button")) {
      toggleLike(story.id);
      renderStory();
    }

    if (event.target.closest("#favorite-button")) {
      toggleFavorite(story.id);
      renderStory();
    }
  });

  commentForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const authorInput = document.querySelector("#comment-author");
    const textInput = document.querySelector("#comment-text");
    const author = authorInput.value.trim();
    const text = textInput.value.trim();

    if (!author || !text) return;

    addComment(story.id, {
      id: crypto.randomUUID(),
      author,
      text,
      date: new Date().toISOString()
    });

    commentForm.reset();
    renderComments();
  });
}

function renderStory() {
  const liked = getLikedStories().includes(story.id);
  const favorite = getFavorites().includes(story.id);
  const baseLikes = Number(story.likes) || 0;

  storyContent.innerHTML = `
    <img class="reading-cover"
         src="${escapeHTML(story.cover || "")}"
         alt="Cover for ${escapeHTML(story.title)}">

    <div class="reading-body">
      <span class="genre-tag">${escapeHTML(story.genre)}</span>
      <h1>${escapeHTML(story.title)}</h1>
      <p class="story-author">Written by ${escapeHTML(story.author)}</p>
      <p class="reading-description">${escapeHTML(story.description || "")}</p>

      <div class="reading-text">
        ${renderStoryContent(story.content || "", story.images || [])}
      </div>

      <div class="reading-actions">
        <button id="like-button" class="button button-secondary"
                type="button" aria-pressed="${liked}">
          ${liked ? "♥ Liked" : "♡ Like"} · ${baseLikes + (liked ? 1 : 0)}
        </button>

        <button id="favorite-button" class="button button-secondary"
                type="button" aria-pressed="${favorite}">
          ${favorite ? "★ Saved" : "☆ Save to favorites"}
        </button>
      </div>
    </div>
  `;
}

function renderStoryContent(content, images) {
  const parts = content.split(/(\[\[image:\d+\]\])/g);

  return parts.map((part) => {
    const match = part.match(/^\[\[image:(\d+)\]\]$/);

    if (match) {
      const image = images[Number(match[1])];

      if (!image || !image.startsWith("data:image/")) {
        return "";
      }

      return `
        <figure class="story-inline-image">
          <img src="${escapeHTML(image)}" alt="Image in ${escapeHTML(story.title)}"
               loading="lazy">
        </figure>
      `;
    }

    return escapeHTML(part).replace(/\r?\n/g, "<br>");
  }).join("");
}

function renderComments() {
  const comments = getComments(story.id);

  commentCount.textContent =
    `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`;

  if (!comments.length) {
    commentsList.innerHTML =
      '<p class="no-comments">No comments yet. Be the first to share your thoughts.</p>';
    return;
  }

  commentsList.innerHTML = comments.map((comment) => `
    <article class="comment-card">
      <div class="comment-header">
        <strong>${escapeHTML(comment.author)}</strong>
        <time datetime="${escapeHTML(comment.date)}">
          ${formatDate(comment.date)}
        </time>
      </div>
      <p>${escapeHTML(comment.text)}</p>
    </article>
  `).join("");
}

function formatDate(date) {
  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}