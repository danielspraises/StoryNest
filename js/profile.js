import { supabase, isSupabaseConfigured } from "./supabase.js";

const message = document.querySelector("#profile-message");
const storyGrid = document.querySelector("#profile-story-grid");
const emptyState = document.querySelector("#profile-empty-state");
const signinLink = document.querySelector("#profile-signin");

document.querySelector("#current-year")?.replaceChildren(
  document.createTextNode(String(new Date().getFullYear()))
);

function showMessage(text, type = "") {
  if (!message) return;
  message.textContent = text;
  message.className = `form-message ${type}`.trim();
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function renderStories(stories) {
  if (!storyGrid || !emptyState) return;

  storyGrid.replaceChildren();

  if (!stories.length) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  for (const story of stories) {
    const card = document.createElement("article");
    card.className = "story-card";

    const cover = story.cover_url ||
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80";

    card.innerHTML = `
      <img class="story-cover" src="${escapeHTML(cover)}"
        alt="Cover for ${escapeHTML(story.title)}" loading="lazy">
      <div class="story-card-body">
        <span class="genre-tag">${escapeHTML(story.genre)}</span>
        <h3>${escapeHTML(story.title)}</h3>
        <p class="story-description">${escapeHTML(story.description)}</p>
        <div class="story-card-footer">
          <span class="like-count">${Number(story.likes_count) || 0} likes</span>
          <a class="read-link" href="story.html?id=${encodeURIComponent(story.id)}">Read story →</a>
        </div>
      </div>
    `;

    storyGrid.append(card);
  }
}

async function loadProfile() {
  if (!isSupabaseConfigured) {
    showMessage("Configure your Supabase URL and publishable key in js/supabase.js.", "error");
    return;
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) throw authError;

    const user = authData.user;

    if (!user) {
      showMessage("Please sign in to view your profile.", "error");
      if (signinLink) signinLink.hidden = false;
      return;
    }

    if (signinLink) {
      signinLink.textContent = "Sign Out";
      signinLink.href = "#signout";
      signinLink.addEventListener("click", async (event) => {
        event.preventDefault();
        const { error } = await supabase.auth.signOut();
        if (error) {
          showMessage(error.message, "error");
          return;
        }
        window.location.href = "index.html";
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, username, bio")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    const displayName =
      profile?.display_name ||
      user.user_metadata?.display_name ||
      "StoryNest Reader";

    document.querySelector("#profile-name").textContent = displayName;
    document.querySelector("#profile-username").textContent =
      profile?.username ? `@${profile.username}` : user.email;
    document.querySelector("#profile-bio").textContent =
      profile?.bio || "Welcome to your StoryNest profile.";
    document.querySelector(".profile-avatar").textContent =
      displayName.charAt(0).toUpperCase();

    showMessage("Your profile is loaded.", "success");

    const { data: stories, error: storiesError } = await supabase
      .from("stories")
      .select("id, title, genre, description, cover_url, likes_count, created_at")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false });

    if (storiesError) throw storiesError;

    renderStories(stories || []);
  } catch (error) {
    showMessage(
      `${error.message || "Could not load your profile."} Check that the Supabase tables and Row Level Security policies are set up.`,
      "error"
    );
  }
}

loadProfile();
