import { supabase, isSupabaseConfigured } from "./supabase.js";

const header = document.querySelector(".site-header");

document.querySelector("#current-year")?.replaceChildren(
  document.createTextNode(String(new Date().getFullYear()))
);

if (header) {
  let accountContainer =
    header.querySelector(".account-nav, .account-links");

  if (!accountContainer) {
    accountContainer = document.createElement("div");
    accountContainer.className = "account-nav";
    header.append(accountContainer);
  }

  // Ensure that the header has only one account container.
  header.querySelectorAll(".account-nav, .account-links").forEach((element) => {
    if (element !== accountContainer) element.remove();
  });

  let renderVersion = 0;

  async function renderAccount(knownUser) {
    const thisRender = ++renderVersion;
    accountContainer.replaceChildren();

    let user = knownUser;

    if (isSupabaseConfigured && typeof knownUser === "undefined") {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        user = data.user;
      } catch (error) {
        console.error("Could not check the current user:", error);
        user = null;
      }
    }

    if (thisRender !== renderVersion) return;

    let displayName =
      user?.user_metadata?.display_name ||
      user?.user_metadata?.username ||
      user?.email?.split("@")[0] ||
      "StoryNest Reader";

    if (user && isSupabaseConfigured) {
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("id", user.id)
          .maybeSingle();

        if (!error && profile) {
          displayName =
            profile.display_name ||
            profile.username ||
            displayName;
        }
      } catch (error) {
        console.warn("Could not load profile name:", error);
      }
    }

    // Ignore any render that was superseded while waiting for Supabase.
    if (thisRender !== renderVersion) return;

    const wrapper = document.createElement("div");
    wrapper.className = "account-icon-wrap";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "account-icon-trigger";
    trigger.setAttribute("aria-label", "Account options");
    trigger.setAttribute("aria-expanded", "false");
    trigger.title = user ? `Account: ${displayName}` : "Account options";

    // A consistent person icon for signed-in and signed-out visitors.
    trigger.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"
           focusable="false">
        <circle cx="12" cy="8" r="3.5"></circle>
        <path d="M5 20c.5-3.5 3-5.5 7-5.5s6.5 2 7 5.5"></path>
      </svg>
    `;

    const menu = document.createElement("div");
    menu.className = "account-hover-menu";
    menu.setAttribute("aria-label", "Account links");

    function addLink(href, label) {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = label;
      menu.append(link);
    }

    if (user) {
      const name = document.createElement("p");
      name.className = "account-menu-name";
      name.textContent = displayName;
      menu.append(name);

      addLink("profile.html", "My profile");

      const logoutButton = document.createElement("button");
      logoutButton.type = "button";
      logoutButton.className = "account-menu-button";
      logoutButton.textContent = "Log out";

      logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;
        logoutButton.textContent = "Logging out...";

        const { error } = await supabase.auth.signOut();

        if (error) {
          logoutButton.disabled = false;
          logoutButton.textContent = "Log out";
          alert(error.message);
          return;
        }

        window.location.href = "index.html";
      });

      menu.append(logoutButton);
    } else {
      addLink("login.html", "Sign in");
      addLink("signup.html", "Sign up");
    }

    trigger.addEventListener("click", () => {
      wrapper.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
    });

    trigger.addEventListener("focus", () => {
      wrapper.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
    });

    wrapper.addEventListener("mouseenter", () => {
      trigger.setAttribute("aria-expanded", "true");
    });

    wrapper.addEventListener("mouseleave", () => {
      if (!wrapper.contains(document.activeElement)) {
        wrapper.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });

    wrapper.addEventListener("focusout", (event) => {
      if (!wrapper.contains(event.relatedTarget)) {
        wrapper.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });

    wrapper.append(trigger, menu);
    accountContainer.append(wrapper);
  }

  // Close the dropdown when clicking elsewhere or pressing Escape.
  document.addEventListener("click", (event) => {
    if (accountContainer.contains(event.target)) return;

    const wrapper = accountContainer.querySelector(".account-icon-wrap");
    const trigger = wrapper?.querySelector(".account-icon-trigger");

    wrapper?.classList.remove("is-open");
    trigger?.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    const wrapper = accountContainer.querySelector(".account-icon-wrap");
    const trigger = wrapper?.querySelector(".account-icon-trigger");

    wrapper?.classList.remove("is-open");
    trigger?.setAttribute("aria-expanded", "false");
    trigger?.focus();
  });

  renderAccount();

  if (isSupabaseConfigured) {
    supabase.auth.onAuthStateChange((_event, session) => {
      // Defer rendering until the auth callback has completed.
      window.setTimeout(() => {
        renderAccount(session?.user ?? null);
      }, 0);
    });
  }
}
