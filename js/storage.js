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
} catch {
return fallback;
}
}

function writeJSON(key, value) {
localStorage.setItem(key, JSON.stringify(value));
}

export function getUserStories() {
return readJSON(STORAGE_KEYS.stories, []);
}

export function getAllStories(defaultStories) {
return [...getUserStories(), ...defaultStories];
}

export function getLikedStories() {
return readJSON(STORAGE_KEYS.likes, []);
}

export function toggleLike(storyId) {
const likes = getLikedStories();
const alreadyLiked = likes.includes(storyId);

const updatedLikes = alreadyLiked
? likes.filter((id) => id !== storyId)
: [...likes, storyId];

writeJSON(STORAGE_KEYS.likes, updatedLikes);
return !alreadyLiked;
}

export function getComments(storyId) {
const comments = readJSON(STORAGE_KEYS.comments, {});
return comments[storyId] || [];
}

export function addComment(storyId, comment) {
const comments = readJSON(STORAGE_KEYS.comments, {});
comments[storyId] = [...(comments[storyId] || []), comment];
writeJSON(STORAGE_KEYS.comments, comments);
}

export function getFavorites() {
return readJSON(STORAGE_KEYS.favorites, []);
}

export function toggleFavorite(storyId) {
const favorites = getFavorites();
const alreadySaved = favorites.includes(storyId);

const updatedFavorites = alreadySaved
? favorites.filter((id) => id !== storyId)
: [...favorites, storyId];

writeJSON(STORAGE_KEYS.favorites, updatedFavorites);
return !alreadySaved;
}
