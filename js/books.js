import { searchOpenLibrary } from "./api.js";

const form = document.querySelector("#book-search-form");
const input = document.querySelector("#book-search-input");
const results = document.querySelector("#book-results");
const status = document.querySelector("#book-search-status");

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function renderBooks(books) {
  if (!books.length) {
    results.innerHTML = "";
    status.textContent = "No books found. Try another title or author.";
    return;
  }

  results.innerHTML = books.map((book) => `
    <article class="book-card">
      ${
        book.cover
          ? `<img class="book-cover" src="${escapeHtml(book.cover)}" alt="Cover of ${escapeHtml(book.title)}" loading="lazy">`
          : `<div class="book-cover book-cover-placeholder">No cover available</div>`
      }
      <div class="book-card-body">
        <h3>${escapeHtml(book.title)}</h3>
        <p class="book-author">${escapeHtml(book.authors.join(", "))}</p>
        <p class="book-year">${book.year ? `First published ${book.year}` : "Publication year unavailable"}</p>
        <a class="read-link" href="${escapeHtml(book.url)}" target="_blank" rel="noopener noreferrer">
          View on Open Library ↗
        </a>
      </div>
    </article>
  `).join("");

  status.textContent = `${books.length} book${books.length === 1 ? "" : "s"} found.`;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const query = input.value.trim();
  if (!query) {
    status.textContent = "Enter a book title, author, or keyword.";
    input.focus();
    return;
  }

  status.textContent = "Searching Open Library…";
  results.innerHTML = "";

  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;

  try {
    const books = await searchOpenLibrary(query);
    renderBooks(books);
  } catch (error) {
    console.error("Open Library search failed:", error);
    status.textContent = error.message || "Could not search books right now.";
  } finally {
    if (button) button.disabled = false;
  }
});
