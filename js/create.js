import { supabase, isSupabaseConfigured } from "./supabase.js";
import { searchUnsplash, trackUnsplashDownload } from "./api.js";

const form = document.querySelector("#publish-form") ||
  document.querySelector(".publish-form");

const featuredInput = document.querySelector("#featured-image");
const featuredPreview = document.querySelector("#featured-preview");
const inlineInput = document.querySelector("#inline-image");
const inlinePreview = document.querySelector("#inline-preview");
const contentInput = document.querySelector("#content");
const insertImageButton = document.querySelector("#insert-image-button");
const imageStatus = document.querySelector("#image-status");
const publishButton = document.querySelector("#publish-button");
const message = document.querySelector("#form-message");

const BUCKET = "story-images";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1400;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

let featuredFile = null;
let inlineFiles = [];
let selectedUnsplashPhoto = null;

const unsplashForm = document.querySelector("#unsplash-search-form");
const unsplashInput = document.querySelector("#unsplash-search-input");
const unsplashResults = document.querySelector("#unsplash-results");
const unsplashStatus = document.querySelector("#unsplash-status");
const unsplashSelected = document.querySelector("#unsplash-selected");
const unsplashPreview = document.querySelector("#unsplash-preview");
const unsplashAttribution = document.querySelector("#unsplash-attribution");
const unsplashClear = document.querySelector("#unsplash-clear");

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function selectUnsplashPhoto(photo) {
  selectedUnsplashPhoto = photo;
  if (featuredInput) featuredInput.value = "";
  featuredFile = null;

  if (featuredPreview) {
    featuredPreview.removeAttribute("src");
    featuredPreview.hidden = true;
  }

  if (unsplashPreview) {
    unsplashPreview.src = photo.full;
    unsplashPreview.hidden = false;
  }

  if (unsplashSelected) unsplashSelected.hidden = false;
  if (unsplashAttribution) {
    unsplashAttribution.innerHTML =
      `Photo by <a href="${escapeHtml(photo.photographerUrl)}?utm_source=storynest&utm_medium=referral" target="_blank" rel="noopener noreferrer">${escapeHtml(photo.photographer)}</a> on <a href="${escapeHtml(photo.photoUrl)}?utm_source=storynest&utm_medium=referral" target="_blank" rel="noopener noreferrer">Unsplash</a>`;
  }

  trackUnsplashDownload(photo);
  showMessage("Unsplash cover selected. It will be used when you publish.", "success");
}

unsplashForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = unsplashInput.value.trim();
  if (!query) return;

  unsplashStatus.textContent = "Searching Unsplash…";
  unsplashResults.innerHTML = "";
  const button = unsplashForm.querySelector('button[type="submit"]');
  if (button) button.disabled = true;

  try {
    const photos = await searchUnsplash(query);

    if (!photos.length) {
      unsplashStatus.textContent = "No photos found. Try another search.";
      return;
    }

    unsplashResults.innerHTML = photos.map((photo, index) => `
      <button class="unsplash-result" type="button" data-photo-index="${index}"
        aria-label="Select photo by ${escapeHtml(photo.photographer)}">
        <img src="${escapeHtml(photo.thumb)}" alt="${escapeHtml(photo.description)}" loading="lazy">
        <span>${escapeHtml(photo.photographer)}</span>
      </button>
    `).join("");

    unsplashResults.querySelectorAll("[data-photo-index]").forEach((button) => {
      button.addEventListener("click", () => {
        selectUnsplashPhoto(photos[Number(button.dataset.photoIndex)]);
      });
    });

    unsplashResults.dataset.photoCount = String(photos.length);
    unsplashStatus.textContent = `${photos.length} photos found. Select one to use as your cover.`;
  } catch (error) {
    unsplashStatus.textContent = error.message || "Could not search Unsplash.";
  } finally {
    if (button) button.disabled = false;
  }
});

unsplashClear?.addEventListener("click", () => {
  selectedUnsplashPhoto = null;
  if (unsplashSelected) unsplashSelected.hidden = true;
  if (unsplashPreview) unsplashPreview.removeAttribute("src");
  if (unsplashStatus) unsplashStatus.textContent = "Selected Unsplash cover removed.";
  showMessage("");
});

function showMessage(text, type = "") {
  if (!message) return;
  message.textContent = text;
  message.className = `form-message ${type}`.trim();
}

function setBusy(busy, label = "Publish Story") {
  if (publishButton) {
    publishButton.disabled = busy;
    publishButton.textContent = busy ? "Publishing..." : label;
  }
}

function validateImage(file) {
  if (!file) return "Choose an image first.";
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Use a JPG, PNG, or WebP image.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "Each image must be 10 MB or smaller.";
  }
  return "";
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(
        1,
        MAX_IMAGE_DIMENSION / Math.max(image.width, image.height)
      );

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Could not process the selected image."));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not compress the selected image."));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        0.82
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read the selected image."));
    };

    image.src = objectUrl;
  });
}

function previewFile(file, preview) {
  if (!preview || !file) return;
  const oldUrl = preview.dataset.objectUrl;
  if (oldUrl) URL.revokeObjectURL(oldUrl);

  const url = URL.createObjectURL(file);
  preview.dataset.objectUrl = url;
  preview.src = url;
  preview.hidden = false;
}

async function requireUser() {
  if (!isSupabaseConfigured) {
    throw new Error("Configure your Supabase URL and publishable key in js/supabase.js.");
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  if (!data.user) {
    window.location.replace(
      `login.html?redirect=${encodeURIComponent("create.html")}`
    );
    return null;
  }

  return data.user;
}

async function getDisplayName(user) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  return profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "StoryNest Reader";
}

async function uploadImage(file, userId, prefix) {
  const validation = validateImage(file);
  if (validation) throw new Error(validation);

  const blob = await compressImage(file);
  const path = `${userId}/${prefix}-${crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: "image/jpeg",
      cacheControl: "3600",
      upsert: false
    });

  if (error) {
    if (/bucket/i.test(error.message)) {
      throw new Error(`Storage upload failed. Create the "${BUCKET}" bucket and apply the storage policies from supabase-storage-policies.sql.`);
    }
    throw error;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

if (featuredInput) {
  featuredInput.addEventListener("change", () => {
    featuredFile = featuredInput.files?.[0] || null;
    if (!featuredFile) return;

    const error = validateImage(featuredFile);
    if (error) {
      featuredFile = null;
      featuredInput.value = "";
      showMessage(error, "error");
      return;
    }

    previewFile(featuredFile, featuredPreview);
    showMessage("");
  });
}

if (inlineInput) {
  inlineInput.addEventListener("change", () => {
    const file = inlineInput.files?.[0];
    if (!file) return;

    const error = validateImage(file);
    if (error) {
      inlineInput.value = "";
      if (imageStatus) imageStatus.textContent = error;
      return;
    }

    previewFile(file, inlinePreview);
    if (imageStatus) imageStatus.textContent = "Image ready to insert.";
    if (insertImageButton) insertImageButton.disabled = false;
  });
}

if (insertImageButton) {
  insertImageButton.addEventListener("click", () => {
    const file = inlineInput?.files?.[0];
    if (!file || !contentInput) {
      if (imageStatus) imageStatus.textContent = "Choose an inline image first.";
      return;
    }

    const error = validateImage(file);
    if (error) {
      if (imageStatus) imageStatus.textContent = error;
      return;
    }

    const index = inlineFiles.length;
    inlineFiles.push(file);

    const marker = `[[image:${index}]]`;
    const start = contentInput.selectionStart ?? contentInput.value.length;
    const end = contentInput.selectionEnd ?? start;
    const before = contentInput.value.slice(0, start);
    const after = contentInput.value.slice(end);
    const separatorBefore = before && !before.endsWith("\n") ? "\n\n" : "";
    const separatorAfter = after && !after.startsWith("\n") ? "\n\n" : "";

    contentInput.value =
      before + separatorBefore + marker + separatorAfter + after;

    const cursor = (before + separatorBefore + marker + separatorAfter).length;
    contentInput.focus();
    contentInput.setSelectionRange(cursor, cursor);

    inlineInput.value = "";
    if (inlinePreview) {
      inlinePreview.removeAttribute("src");
      inlinePreview.hidden = true;
    }
    if (insertImageButton) insertImageButton.disabled = true;
    if (imageStatus) imageStatus.textContent = "Image added to your story. It will upload when you publish.";
  });
}

async function publishStory(event) {
  event.preventDefault();
  showMessage("");

  if (!form) return;

  let user;
  try {
    user = await requireUser();
    if (!user) return;
  } catch (error) {
    showMessage(error.message || "Please sign in to publish.", "error");
    return;
  }

  const title = form.querySelector("#title")?.value.trim() || "";
  const genre = form.querySelector("#genre")?.value || "";
  const description = form.querySelector("#description")?.value.trim() || "";
  const content = contentInput?.value.trim() || "";

  if (!title || !genre || !description || !content) {
    showMessage("Complete the title, genre, description, and story content.", "error");
    return;
  }

  setBusy(true);

  const uploadedPaths = [];

  try {
    const displayName = await getDisplayName(user);

    let coverUrl = null;
    if (featuredFile) {
      coverUrl = await uploadImage(featuredFile, user.id, "cover");
      uploadedPaths.push(coverUrl);
    }

    const inlineImageUrls = [];
    for (let i = 0; i < inlineFiles.length; i += 1) {
      const url = await uploadImage(inlineFiles[i], user.id, `inline-${i}`);
      inlineImageUrls.push(url);
      uploadedPaths.push(url);
    }

    // Author identity is determined by Supabase Auth, never a form field.
    const { data: insertedStory, error } = await supabase
      .from("stories")
      .insert({
        author_id: user.id,
        title,
        genre,
        description,
        content,
        cover_url: coverUrl,
        inline_images: inlineImageUrls,
        likes_count: 0
      })
      .select("id")
      .single();

    if (error) throw error;

    showMessage(`Published successfully as ${displayName}! Opening your story...`, "success");
    window.location.href = `story.html?id=${encodeURIComponent(insertedStory.id)}`;
  } catch (error) {
    // Uploaded images may remain in Storage if a later database insert fails.
    console.error("Story publishing failed:", error);
    showMessage(
      `${error.message || "Could not publish your story."} Your story was not confirmed as saved.`,
      "error"
    );
    setBusy(false);
  }
}

if (form) {
  requireUser().catch((error) => {
    showMessage(error.message || "Please sign in to create a story.", "error");
  });

  form.addEventListener("submit", publishStory);
}

