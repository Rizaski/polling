(function () {
  function showError(msg) {
    var el = document.getElementById("auth-error");
    if (!el) return;
    el.textContent = msg;
    el.hidden = !msg;
  }

  function setProfileDropdown(open) {
    var dd = document.getElementById("auth-profile-dropdown");
    var btn = document.getElementById("auth-profile-toggle");
    if (!dd || !btn) return;
    dd.hidden = !open;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.classList.toggle("user-profile__trigger--open", open);
  }

  function closeProfileDropdown() {
    setProfileDropdown(false);
  }

  function updateUI(user) {
    var userEl = document.getElementById("auth-user");
    var avatar = document.getElementById("auth-avatar");
    var fallback = document.getElementById("auth-avatar-fallback");
    var nameEl = document.getElementById("auth-name");
    var phoneEl = document.getElementById("auth-phone");
    if (!userEl) return;

    showError("");

    if (user && (user.phoneNumber || user.email)) {
      closeProfileDropdown();
      userEl.removeAttribute("hidden");
      document.body.classList.add("auth-verified");

      var displayName = user.displayName || "";
      var phone = user.phoneNumber || "";
      var email = user.email || "";
      var primaryLabel = phone || email || "";
      var initialChar =
        displayName.trim().charAt(0) ||
        primaryLabel.replace(/\D/g, "").slice(-1) ||
        primaryLabel.charAt(0) ||
        "?";
      var initial = (initialChar + "").toUpperCase();

      if (avatar && fallback) {
        avatar.alt = displayName || primaryLabel || "Account";
        fallback.textContent = initial;
        if (user.photoURL) {
          avatar.onerror = function () {
            avatar.hidden = true;
            fallback.hidden = false;
          };
          avatar.onload = function () {
            avatar.hidden = false;
            fallback.hidden = true;
          };
          avatar.src = user.photoURL;
          avatar.hidden = false;
          fallback.hidden = true;
        } else {
          avatar.removeAttribute("src");
          avatar.hidden = true;
          fallback.hidden = false;
        }
      }
      if (nameEl) {
        nameEl.textContent =
          displayName || (phone ? phone : email.split("@")[0]) || email || "?";
      }
      if (phoneEl) phoneEl.textContent = primaryLabel;
    }
  }

  function boot() {
    if (typeof firebase === "undefined") {
      showError("Firebase could not load.");
      return;
    }

    if (typeof firebaseConfig === "undefined") {
      showError("Missing firebase-config.js");
      return;
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    var auth = firebase.auth();

    var signInLink = document.getElementById("auth-signin-link");

    auth.onAuthStateChanged(function (user) {
      if (!user || (!user.email && !user.phoneNumber)) {
        var userEl = document.getElementById("auth-user");
        if (userEl) userEl.setAttribute("hidden", "");
        document.body.classList.remove("auth-verified");
        if (signInLink) signInLink.removeAttribute("hidden");
        showError("");
        return;
      }
      if (signInLink) signInLink.setAttribute("hidden", "");
      updateUI(user);
    });

    var signOutBtn = document.getElementById("auth-signout");
    if (signOutBtn) {
      signOutBtn.addEventListener("click", function () {
        signOutBtn.disabled = true;
        closeProfileDropdown();
        auth
          .signOut()
          .then(function () {
            window.location.href = "index.html";
          })
          .catch(function (err) {
            console.error(err);
            showError(err.message || "Sign out failed.");
            signOutBtn.disabled = false;
          });
      });
    }

    var profileToggle = document.getElementById("auth-profile-toggle");
    var profileCompact = document.querySelector(".user-profile__compact");
    if (profileToggle && profileCompact) {
      profileToggle.addEventListener("click", function (e) {
        e.stopPropagation();
        var dd = document.getElementById("auth-profile-dropdown");
        var isOpen = dd && !dd.hidden;
        setProfileDropdown(!isOpen);
      });
      document.addEventListener("click", function (e) {
        if (!profileCompact.contains(e.target)) {
          closeProfileDropdown();
        }
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          closeProfileDropdown();
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
