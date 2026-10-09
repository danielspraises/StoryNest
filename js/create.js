import { getUserStories } from "./storage.js";

const form = document.querySelector("#story-form");
const message = document.querySelector("#form-message");
const contentInput = document.querySelector("#story-content");
const featuredInput = document.querySelector("#featured-image");
const inlineInput = document.querySelector("#inline-image");
const featuredPreview = document.querySelector("#featured-preview");
const inlinePreview = document.querySelector("#inline-preview");
const insertButton = document.querySelector("#insert-image-button");
const imageStatus = document.querySelector("#image-status");
const publishButton = document.querySelector("#publish-button");

let featuredImage = "";
let inlineImage = "";
let inlineImages = [];

document.querySelector("#current-year").textContent =
  new Date().getFullYear();

function showMessage(text, type, storyId = "") {
  message.replaceChildren();
  message.className = `form-message ${type}`;
  message.hidden = false;

  const textElement = document.createElement("p");
  textElement.textContent = text;
  message.append(textElement);

  if (type === "success" && storyId) {
    const link = document.createElement("a");
    link.className = "button button-primary";
    link.href = `story.html?id=${encodeURIComponent(storyId)}`;
    link.textContent = "View your published story";
    message.append(link);
  }

  message.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function readAndCompressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Please choose a valid image file."));
      return;
    }

    // Limit the original file to 10 MB before processing.
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error("Choose an image smaller than 10 MB."));
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.onload = () => {
      const image = new Image();

      image.onerror = () => reject(new Error("This image file could not be opened."));
      image.onload = () => {
        const maxDimension = 1200;
        const scale = Math.min(
          1,
          maxDimension / Math.max(image.width, image.height)
        );

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Image processing is not supported by this browser."));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/jpeg", 0.75);

        // Keep individual compressed images reasonably small for localStorage.
        if (compressed.length > 700_000) {
          reject(new Error(
            "This image is still too large after compression. Choose a smaller image."
          ));
          return;
        }

        resolve(compressed);
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

featuredInput.addEventListener("change", async () => {
  const file = featuredInput.files[0];
  if (!file) return;

  featuredPreview.hidden = true;
  featuredImage = "";

  try {
    featuredImage = await readAndCompressImage(file);
    featuredPreview.src = featuredImage;
    featuredPreview.hidden = false;
    showMessage("Featured image ready.", "success");
  } catch (error) {
    featuredInput.value = "";
    showMessage(error.message, "error");
  }
});

inlineInput.addEventListener("change", async () => {
  const file = inlineInput.files[0];
  if (!file) return;

  insertButton.disabled = true;
  inlinePreview.hidden = true;
  inlineImage = "";
  imageStatus.textContent = "Preparing image…";

  try {
    inlineImage = await readAndCompressImage(file);
    inlinePreview.src = inlineImage;
    inlinePreview.hidden = false;
    insertButton.disabled = false;
    imageStatus.textContent = "Image ready to insert.";
  } catch (error) {
    inlineInput.value = "";
    imageStatus.textContent = "";
    showMessage(error.message, "error");
  }
});

insertButton.addEventListener("click", () => {
  if (!inlineImage) {
    showMessage("Choose an image before inserting it.", "error");
    return;
  }

  const imageIndex = inlineImages.length;
  inlineImages.push(inlineImage);

  const marker = `[[image:${imageIndex}]]`;
  const start = contentInput.selectionStart;
  const end = contentInput.selectionEnd;
  const currentText = contentInput.value;

  contentInput.value =
    currentText.slice(0, start) + "\n\n" + marker + "\n\n" +
    currentText.slice(end);

  const cursorPosition = start + marker.length + 4;
  contentInput.focus();
  contentInput.setSelectionRange(cursorPosition, cursorPosition);

  inlineImage = "";
  inlineInput.value = "";
  inlinePreview.hidden = true;
  insertButton.disabled = true;
  imageStatus.textContent = "Image inserted. It will appear when readers open your story.";
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  message.hidden = true;

  if (!form.reportValidity()) {
    showMessage("Please check the form and complete all required fields.", "error");
    return;
  }

  const formData = new FormData(form);
  const title = String(formData.get("title") || "").trim();
  const author = String(formData.get("author") || "").trim();
  const genre = String(formData.get("genre") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const content = contentInput.value.trim();

  if (!title || !author || !genre || !description || content.length < 20) {
    showMessage("Please complete every required field. Your story must contain at least 20 characters.", "error");
    return;
  }

  publishButton.disabled = true;
  publishButton.textContent = "Publishing…";

  try {
    const userStories = getUserStories();

    const newStory = {
      id: `user-${crypto.randomUUID()}`,
      title,
      author,
      genre,
      description,
      content,
      cover: featuredImage ||
        "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80",
      images: inlineImages,
      likes: 0,
      createdAt: new Date().toISOString()
    };

    userStories.unshift(newStory);

    // Save first; only show success if localStorage confirms the write.
    localStorage.setItem("storynest-stories", JSON.stringify(userStories));

    const savedStories = JSON.parse(
      localStorage.getItem("storynest-stories") || "[]"
    );

    if (!savedStories.some((story) => story.id === newStory.id)) {
      throw new Error("The story could not be verified after saving.");
    }

    showMessage("Success! Your story has been published and saved in this browser.",
      "success", newStory.id);
  } catch (error) {
    console.error("Story publishing failed:", error);

    showMessage(
      error.name === "QuotaExceededError"
        ? "Your browser storage is full. Try using smaller images or removing old saved stories."
        : "We couldn't save your story. Your form content is still here—please try again.",
      "error"
    );
  } finally {
    publishButton.disabled = false;
    publishButton.textContent = "Publish story";
  }
});