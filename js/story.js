import { supabase, isSupabaseConfigured } from "./supabase.js";

const storyContent = document.querySelector("#story-content");
const commentForm = document.querySelector("#comment-form");
const commentsList = document.querySelector("#comments-list");
const commentCount = document.querySelector("#comment-count");
const commentAuthorInput = document.querySelector("#comment-author");
const commentTextInput = document.querySelector("#comment-text");
const storyId = new URLSearchParams(window.location.search).get("id");

let story = null;
let currentUser = null;
let isLiked = false;
let isFavorite = false;
let likeCount = 0;
let comments = [];

document.querySelector("#current-year").textContent =
  new Date().getFullYear();

start();

async function start() {
  if (!isSupabaseConfigured) {
    showError("Supabase is not configured. Check js/supabase.js.");
    return;
  }

  if (!storyId) {
    showError("No story ID was provided in the link.");
    return;
  }

  try {
    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError) throw userError;
    currentUser = userData.user;

    await loadStory();
    await loadInteractions();
    await loadComments();

    renderStory();
    renderComments();
    configureCommentForm();
  } catch (error) {
    console.error("Could not load story:", error);
    showError(
      error.message || "Unable to load this story. Please try again."
    );
  }
}

async function loadStory() {
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("id", storyId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    showError(
      "This story could not be found in the database. Check that the story exists and that its read policy allows public access."
    );
    throw new Error("Story not found.");
  }

  story = data;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", story.author_id)
    .maybeSingle();

  if (profileError) {
    console.warn("Could not load author profile:", profileError.message);
  }

  story.author =
    profile?.display_name ||
    profile?.username ||
    "StoryNest Reader";

  story.cover = story.cover_url || "";
  story.images = Array.isArray(story.inline_images)
    ? story.inline_images
    : [];

  document.title = `${story.title} | StoryNest`;
}

async function loadInteractions() {
  const { count, error: likesError } = await supabase
    .from("story_likes")
    .select("*", { count: "exact", head: true })
    .eq("story_id", story.id);

  if (likesError) throw likesError;
  likeCount = count || 0;

  if (!currentUser) {
    isLiked = false;
    isFavorite = false;
    return;
  }

  const [likeResult, favoriteResult] = await Promise.all([
    supabase
      .from("story_likes")
      .select("story_id")
      .eq("story_id", story.id)
      .eq("user_id", currentUser.id)
      .maybeSingle(),

    supabase
      .from("favorites")
      .select("story_id")
      .eq("story_id", story.id)
      .eq("user_id", currentUser.id)
      .maybeSingle()
  ]);

  if (likeResult.error) throw likeResult.error;
  if (favoriteResult.error) throw favoriteResult.error;

  isLiked = Boolean(likeResult.data);
  isFavorite = Boolean(favoriteResult.data);
}

async function loadComments() {
  const { data, error } = await supabase
    .from("comments")
    .select("id, author_id, content, created_at")
    .eq("story_id", story.id)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const commentRows = data || [];
  const authorIds = [
    ...new Set(commentRows.map((comment) => comment.author_id))
  ];

  let profilesById = {};

  if (authorIds.length) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", authorIds);

    if (profilesError) {
      console.warn("Could not load comment author names:", profilesError.message);
    } else {
      profilesById = Object.fromEntries(
        (profiles || []).map((profile) => [profile.id, profile])
      );
    }
  }

  comments = commentRows.map((comment) => {
    const profile = profilesById[comment.author_id];

    return {
      id: comment.id,
      author:
        profile?.display_name ||
        profile?.username ||
        "StoryNest Reader",
      text: comment.content,
      date: comment.created_at
    };
  });
}

function renderStory() {
  const coverMarkup = story.cover
    ? `<img class="reading-cover"
            src="${escapeHTML(story.cover)}"
            alt="Cover for ${escapeHTML(story.title)}">`
    : "";

  storyContent.innerHTML = `
    ${coverMarkup}
    <div class="reading-body">
      <span class="genre-tag">${escapeHTML(story.genre)}</span>
      <h1>${escapeHTML(story.title)}</h1>
      <p class="story-author">Written by ${escapeHTML(story.author)}</p>
      <p class="reading-description">${escapeHTML(story.description || "")}</p>

      <div class="reading-text">
        ${renderStoryContent(story.content || "", story.images)}
      </div>

      <div class="reading-actions">
        <button id="like-button" class="button button-secondary"
                type="button" aria-pressed="${isLiked}">
          ${isLiked ? "♥ Liked" : "♡ Like"} · ${likeCount}
        </button>

        <button id="favorite-button" class="button button-secondary"
                type="button" aria-pressed="${isFavorite}">
          ${isFavorite ? "★ Saved" : "☆ Save to favorites"}
        </button>
      </div>
      <p id="story-action-message" class="form-message" role="status"></p>
    </div>
  `;
}

function renderStoryContent(content, images) {
  const parts = content.split(/(\[\[image:\d+\]\])/g);

  return parts.map((part) => {
    const match = part.match(/^\[\[image:(\d+)\]\]$/);

    if (match) {
      const image = images[Number(match[1])];

      if (
        typeof image !== "string" ||
        !/^https?:\/\//i.test(image)
      ) {
        return "";
      }

      return `
        <figure class="story-inline-image">
          <img src="${escapeHTML(image)}"
               alt="Image in ${escapeHTML(story.title)}"
               loading="lazy">
        </figure>
      `;
    }

    return escapeHTML(part).replace(/\r?\n/g, "<br>");
  }).join("");
}

storyContent.addEventListener("click", async (event) => {
  const likeButton = event.target.closest("#like-button");
  const favoriteButton = event.target.closest("#favorite-button");

  if (!likeButton && !favoriteButton) return;

  if (!currentUser) {
    showActionMessage("Please sign in to like stories or save favorites.");
    return;
  }

  if (likeButton) await toggleStoryLike();
  if (favoriteButton) await toggleStoryFavorite();
});

async function toggleStoryLike() {
  try {
    if (isLiked) {
      const { error } = await supabase
        .from("story_likes")
        .delete()
        .eq("story_id", story.id)
        .eq("user_id", currentUser.id);

      if (error) throw error;

      isLiked = false;
      likeCount = Math.max(0, likeCount - 1);
    } else {
      const { error } = await supabase
        .from("story_likes")
        .insert({
          story_id: story.id,
          user_id: currentUser.id
        });

      if (error) throw error;

      isLiked = true;
      likeCount += 1;
    }

    renderStory();
  } catch (error) {
    console.error("Could not update like:", error);
    showActionMessage(error.message || "Could not update your like.");
  }
}

async function toggleStoryFavorite() {
  try {
    if (isFavorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("story_id", story.id)
        .eq("user_id", currentUser.id);

      if (error) throw error;

      isFavorite = false;
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({
          story_id: story.id,
          user_id: currentUser.id
        });

      if (error) throw error;

      isFavorite = true;
    }

    renderStory();
  } catch (error) {
    console.error("Could not update favorite:", error);
    showActionMessage(error.message || "Could not update your favorite.");
  }
}

function configureCommentForm() {
  if (!currentUser) {
    commentAuthorInput.value = "";
    commentAuthorInput.readOnly = true;
    commentAuthorInput.placeholder = "Sign in to comment";
    commentTextInput.placeholder = "Please sign in to join the conversation.";
    return;
  }

  const profilePromise = supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", currentUser.id)
    .maybeSingle();

  profilePromise.then(({ data }) => {
    if (data) {
      commentAuthorInput.value =
        data.display_name || data.username || "";
    }
  });
}

commentForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    showCommentMessage("Please sign in before posting a comment.");
    return;
  }

  const content = commentTextInput.value.trim();

  if (!content) return;

  const submitButton = commentForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const { error } = await supabase
      .from("comments")
      .insert({
        story_id: story.id,
        author_id: currentUser.id,
        content
      });

    if (error) throw error;

    commentTextInput.value = "";
    await loadComments();
    renderComments();
    showCommentMessage("Comment posted.");
  } catch (error) {
    console.error("Could not post comment:", error);
    showCommentMessage(error.message || "Could not post your comment.");
  } finally {
    submitButton.disabled = false;
  }
});

function renderComments() {
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

function showError(message) {
  storyContent.innerHTML = `
    <div class="not-found">
      <h1>Story not found</h1>
      <p>${escapeHTML(message)}</p>
      <a class="button button-primary" href="index.html">Explore stories</a>
    </div>
  `;

  commentForm.hidden = true;
  commentCount.textContent = "Comments are unavailable.";
}

function showActionMessage(message) {
  const element = document.querySelector("#story-action-message");
  if (element) element.textContent = message;
}

function showCommentMessage(message) {
  let element = document.querySelector("#comment-message");

  if (!element) {
    element = document.createElement("p");
    element.id = "comment-message";
    element.className = "form-message";
    element.setAttribute("role", "status");
    commentForm.append(element);
  }

  element.textContent = message;
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
