const OPEN_LIBRARY_URL = "https://openlibrary.org";

const UNSPLASH_ACCESS_KEY = "OLk4DtvPwpIBxk1zC3crhX3koP0wlLw7fSWknPqzmAc"; 

export async function searchOpenLibrary(query) {
  const cleanQuery = query.trim();

  if (!cleanQuery) return [];

  const url = new URL(`${OPEN_LIBRARY_URL}/search.json`);
  url.searchParams.set("q", cleanQuery);
  url.searchParams.set("limit", "12");
  url.searchParams.set(
    "fields",
    "key,title,author_name,first_publish_year,cover_i,edition_count"
  );

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Open Library is temporarily unavailable. Please try again.");
  }

  const data = await response.json();
  return (data.docs || []).map((book) => ({
    id: book.key,
    title: book.title || "Untitled book",
    authors: book.author_name || ["Unknown author"],
    year: book.first_publish_year || null,
    editions: book.edition_count || 0,
    cover: book.cover_i
      ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
      : null,
    url: `${OPEN_LIBRARY_URL}${book.key}`
  }));
}

export async function searchUnsplash(query) {
  if (!UNSPLASH_ACCESS_KEY) {
    throw new Error(
      "Unsplash is not configured yet. Add your Access Key in js/api.js."
    );
  }

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query.trim());
  url.searchParams.set("per_page", "12");
  url.searchParams.set("orientation", "landscape");

  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(
      response.status === 401 || response.status === 403
        ? "Unsplash rejected the Access Key. Check your key and API application."
        : "Could not load Unsplash images. Please try again."
    );
  }

  const data = await response.json();

  return (data.results || []).map((photo) => ({
    id: photo.id,
    description: photo.alt_description || photo.description || "Story cover",
    thumb: photo.urls.small,
    full: photo.urls.regular,
    photographer: photo.user.name,
    photographerUrl: photo.user.links.html,
    photoUrl: photo.links.html,
    downloadLocation: photo.links.download_location
  }));
}

export async function trackUnsplashDownload(photo) {
  if (!UNSPLASH_ACCESS_KEY || !photo?.downloadLocation) return;

  try {
    await fetch(photo.downloadLocation, {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
      }
    });
  } catch (error) {
    console.warn("Unsplash download tracking could not be completed.", error);
  }
}
