const STORAGE_KEYS = {
  stories: "storynest-stories",
  likes: "storynest-likes",
  comments: "storynest-comments",
  favorites: "storynest-favorites"
};

function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error(`Could not read ${key} from localStorage:`, error);
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getUserStories() {
  const value = readJSON(STORAGE_KEYS.stories, []);
  return Array.isArray(value) ? value : [];
}

export function getAllStories(defaultStories = []) {
  const savedStories = getUserStories();
  const savedIds = new Set(savedStories.map((story) => story.id));

  return [
    ...savedStories,
    ...defaultStories.filter((story) => !savedIds.has(story.id))
  ];
}

export function getLikedStories() {
  const value = readJSON(STORAGE_KEYS.likes, []);
  return Array.isArray(value) ? value : [];
}

export function toggleLike(storyId) {
  const likes = getLikedStories();
  const updated = likes.includes(storyId)
    ? likes.filter((id) => id !== storyId)
    : [...likes, storyId];

  writeJSON(STORAGE_KEYS.likes, updated);
  return updated.includes(storyId);
}

export function getComments(storyId) {
  const comments = readJSON(STORAGE_KEYS.comments, {});
  return Array.isArray(comments[storyId]) ? comments[storyId] : [];
}

export function addComment(storyId, comment) {
  const comments = readJSON(STORAGE_KEYS.comments, {});
  comments[storyId] = [
    ...(Array.isArray(comments[storyId]) ? comments[storyId] : []),
    comment
  ];
  writeJSON(STORAGE_KEYS.comments, comments);
}

export function getFavorites() {
  const value = readJSON(STORAGE_KEYS.favorites, []);
  return Array.isArray(value) ? value : [];
}

export function toggleFavorite(storyId) {
  const favorites = getFavorites();
  const updated = favorites.includes(storyId)
    ? favorites.filter((id) => id !== storyId)
    : [...favorites, storyId];

  writeJSON(STORAGE_KEYS.favorites, updated);
  return updated.includes(storyId);
}
