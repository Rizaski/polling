(function () {
  var POLL_PAGE = "index.html";

  function showError(msg) {
    var el = document.getElementById("auth-error");
    if (!el) return;
    el.textContent = msg;
    el.hidden = !msg;
  }

  function getNextUrl() {
    try {
      var params = new URLSearchParams(window.location.search);
      var next = params.get("next");
      if (next === "index.html" || next === "./index.html") {
        return "index.html";
      }
    } catch (e) {}
    return POLL_PAGE;
  }

  function goToPoll() {
    window.location.replace(getNextUrl());
  }

  function boot() {
    var signInBtn = document.getElementById("auth-signin-google");

    if (typeof firebase === "undefined") {
      showError("Firebase could not load. Check your network or script order.");
      if (signInBtn) signInBtn.disabled = true;
      return;
    }

    if (typeof firebaseConfig === "undefined") {
      showError("Missing firebase-config.js");
      if (signInBtn) signInBtn.disabled = true;
      return;
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    var auth = firebase.auth();

    auth.onAuthStateChanged(function (user) {
      if (user && user.email) {
        goToPoll();
        return;
      }
      if (signInBtn) {
        signInBtn.disabled = false;
        signInBtn.classList.remove("login-form__btn-google--loading");
      }
    });

    if (signInBtn) {
      signInBtn.addEventListener("click", function () {
        signInBtn.disabled = true;
        signInBtn.classList.add("login-form__btn-google--loading");
        showError("");
        var provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        provider.addScope("profile");
        provider.addScope("email");
        auth
          .signInWithPopup(provider)
          .catch(function (err) {
            console.error(err);
            var msg =
              err.code === "auth/popup-closed-by-user"
                ? "Sign-in cancelled."
                : err.message || "Sign-in failed.";
            showError(msg);
            signInBtn.disabled = false;
            signInBtn.classList.remove("login-form__btn-google--loading");
          });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
