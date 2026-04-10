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

  function normalizePhone(raw) {
    var s = String(raw || "")
      .trim()
      .replace(/\s+/g, "");
    if (!s) return "";
    if (s.startsWith("+")) return s;
    if (s.startsWith("960")) return "+" + s;
    return "+960" + s.replace(/^0+/, "");
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.classList.toggle("login-form__btn-submit--loading", loading);
  }

  function boot() {
    var sendBtn = document.getElementById("auth-send-code");
    var verifyBtn = document.getElementById("auth-verify-code");
    var changeBtn = document.getElementById("auth-change-number");
    var phoneInput = document.getElementById("phone-number");
    var codeInput = document.getElementById("phone-code");
    var stepPhone = document.getElementById("login-step-phone");
    var stepCode = document.getElementById("login-step-code");
    var recaptchaContainer = document.getElementById("recaptcha-container");

    var confirmationResult = null;
    var recaptchaVerifier = null;

    function disableAll(disabled) {
      if (sendBtn) sendBtn.disabled = disabled;
      if (verifyBtn) verifyBtn.disabled = disabled;
      if (changeBtn) changeBtn.disabled = disabled;
      if (phoneInput) phoneInput.disabled = disabled;
      if (codeInput) codeInput.disabled = disabled;
    }

    function clearRecaptcha() {
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (e) {
          console.warn(e);
        }
        recaptchaVerifier = null;
      }
      if (recaptchaContainer) {
        recaptchaContainer.innerHTML = "";
      }
    }

    /**
     * Visible reCAPTCHA is more reliable than invisible on localhost / some browsers.
     */
    function setupRecaptcha() {
      clearRecaptcha();
      if (!recaptchaContainer) {
        return Promise.reject(new Error("Missing #recaptcha-container"));
      }
      recaptchaVerifier = new firebase.auth.RecaptchaVerifier(recaptchaContainer, {
        size: "normal",
        callback: function () {
          showError("");
        },
        "expired-callback": function () {
          showError("reCAPTCHA expired. Check the box again.");
        },
      });
      return recaptchaVerifier.render();
    }

    if (typeof firebase === "undefined") {
      showError("Firebase could not load. Check your network or script order.");
      disableAll(true);
      return;
    }

    if (typeof firebaseConfig === "undefined") {
      showError("Missing firebase-config.js");
      disableAll(true);
      return;
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    var auth = firebase.auth();

    setupRecaptcha().catch(function (e) {
      console.error(e);
      showError("Could not load reCAPTCHA. Check ad blockers and refresh.");
      if (sendBtn) sendBtn.disabled = true;
    });

    auth.onAuthStateChanged(function (user) {
      if (user && (user.phoneNumber || user.email)) {
        goToPoll();
        return;
      }
      disableAll(false);
    });

    if (sendBtn && phoneInput) {
      sendBtn.addEventListener("click", function () {
        var phone = normalizePhone(phoneInput.value);
        if (!phone || phone.length < 8) {
          showError("Enter a valid phone number with country code.");
          return;
        }
        if (!recaptchaVerifier) {
          showError("reCAPTCHA is still loading. Wait a moment and try again.");
          return;
        }
        showError("");
        setLoading(sendBtn, true);
        auth
          .signInWithPhoneNumber(phone, recaptchaVerifier)
          .then(function (cr) {
            confirmationResult = cr;
            if (stepPhone) stepPhone.hidden = true;
            if (stepCode) stepCode.hidden = false;
            if (codeInput) {
              codeInput.value = "";
              codeInput.focus();
            }
          })
          .catch(function (err) {
            console.error(err);
            var msg = err.message || "Could not send SMS.";
            if (err.code === "auth/invalid-phone-number") {
              msg = "Invalid phone number. Use + and country code.";
            } else if (err.code === "auth/too-many-requests") {
              msg = "Too many attempts. Try again later.";
            } else if (err.code === "auth/captcha-check-failed") {
              msg = "reCAPTCHA check failed. Complete the checkbox and try again.";
            } else if (err.code === "auth/invalid-app-credential") {
              msg =
                "reCAPTCHA / app check failed. In Firebase: Authentication → Settings → Authorized domains — add localhost, 127.0.0.1, and your live domain. Turn off ad blockers, then refresh the page.";
            } else if (
              err.code === "auth/billing-not-enabled" ||
              err.code === "auth/operation-not-allowed"
            ) {
              msg =
                "Phone sign-in needs Firebase billing (Blaze) and Phone enabled under Sign-in method. Or use test phone numbers there.";
            } else if (
              err.code === "auth/error-code:-39" ||
              /error-code:\s*-39|code:\s*39\b/i.test(String(err.message || ""))
            ) {
              msg =
                "SMS could not be sent (Firebase error 39). Often: too many tries from this network—wait an hour or switch Wi‑Fi/mobile data. Some countries or carriers are temporarily blocked by Firebase; try a test number in Console → Authentication → Phone, or use another sign-in method. If it persists, contact Firebase Support with your project ID.";
            }
            showError(msg);
            setupRecaptcha().catch(function (e) {
              console.error(e);
            });
          })
          .finally(function () {
            setLoading(sendBtn, false);
          });
      });
    }

    if (verifyBtn && codeInput) {
      verifyBtn.addEventListener("click", function () {
        var code = (codeInput.value || "").trim().replace(/\s/g, "");
        if (!code) {
          showError("Enter the code from your SMS.");
          return;
        }
        if (!confirmationResult) {
          showError("Request a new code first.");
          return;
        }
        showError("");
        setLoading(verifyBtn, true);
        confirmationResult
          .confirm(code)
          .then(function () {
            confirmationResult = null;
          })
          .catch(function (err) {
            console.error(err);
            var msg = err.message || "Invalid code.";
            if (err.code === "auth/invalid-verification-code") {
              msg = "Wrong code. Try again.";
            }
            showError(msg);
            setLoading(verifyBtn, false);
          });
      });
    }

    if (changeBtn) {
      changeBtn.addEventListener("click", function () {
        confirmationResult = null;
        showError("");
        if (stepCode) stepCode.hidden = true;
        if (stepPhone) stepPhone.hidden = false;
        if (codeInput) codeInput.value = "";
        setupRecaptcha().catch(function (e) {
          console.error(e);
        });
        if (phoneInput) phoneInput.focus();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
