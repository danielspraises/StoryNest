import { supabase, isSupabaseConfigured } from "./supabase.js";

const loginForm = document.querySelector("#login-form");
const signupForm = document.querySelector("#signup-form");

document.querySelector("#current-year")?.replaceChildren(
  document.createTextNode(String(new Date().getFullYear()))
);

function showMessage(element, message, type = "") {
  if (!element) return;
  element.textContent = message;
  element.className = `form-message ${type}`.trim();
}

function setBusy(button, busy, label) {
  if (!button) return;
  button.disabled = busy;
  button.textContent = busy ? "Please wait..." : label;
}

function safeRedirect(fallback) {
  const requested = new URLSearchParams(window.location.search).get("redirect");
  const allowed = ["create.html", "profile.html", "favorites.html", "index.html", "explore.html"];

  return allowed.includes(requested) ? requested : fallback;
}

async function ensureProfile(user, displayName, username) {
  const { data: existing, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing) return;

  const metadata = user.user_metadata || {};
  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    display_name: displayName || metadata.display_name || "StoryNest Reader",
    username: username || metadata.username || null
  });

  if (error) throw error;
}

if (loginForm) {
  const message = document.querySelector("#login-message");
  const button = document.querySelector("#login-button");

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isSupabaseConfigured) {
      showMessage(message, "Add your Supabase URL and publishable key in js/supabase.js first.", "error");
      return;
    }

    setBusy(button, true, "Sign In");
    showMessage(message, "");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.elements.email.value.trim(),
        password: loginForm.elements.password.value
      });

      if (error) throw error;

      await ensureProfile(data.user);
      window.location.href = safeRedirect("profile.html");
    } catch (error) {
      showMessage(message, error.message || "Could not sign in.", "error");
      setBusy(button, false, "Sign In");
    }
  });
}

if (signupForm) {
  const message = document.querySelector("#signup-message");
  const button = document.querySelector("#signup-button");

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isSupabaseConfigured) {
      showMessage(message, "Add your Supabase URL and publishable key in js/supabase.js first.", "error");
      return;
    }

    const displayName = signupForm.elements.displayName.value.trim();
    const username = signupForm.elements.username.value.trim().toLowerCase();
    const email = signupForm.elements.email.value.trim();
    const password = signupForm.elements.password.value;

    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      showMessage(message, "Username must be 3–24 characters using letters, numbers, or underscores.", "error");
      return;
    }

    setBusy(button, true, "Create Account");
    showMessage(message, "");

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName, username } }
      });

      if (error) throw error;

      if (data.session && data.user) {
        await ensureProfile(data.user, displayName, username);
        window.location.href = safeRedirect("profile.html");
        return;
      }

      showMessage(message, "Account created. Check your email to confirm your account, then sign in.", "success");
      signupForm.reset();
    } catch (error) {
      showMessage(message, error.message || "Could not create your account.", "error");
    } finally {
      setBusy(button, false, "Create Account");
    }
  });
}
