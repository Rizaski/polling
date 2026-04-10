(function () {
  var POLL_PAGE = "index.html";
  var OTP_LEN = 6;

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

  function getOtpInputs() {
    var wrap = document.getElementById("otp-inputs");
    if (!wrap) return [];
    return Array.prototype.slice.call(
      wrap.querySelectorAll(".login-form__otp-digit")
    );
  }

  function clearOtp() {
    getOtpInputs().forEach(function (inp) {
      inp.value = "";
    });
  }

  function getOtpCode() {
    return getOtpInputs()
      .map(function (inp) {
        return (inp.value || "").replace(/\D/g, "");
      })
      .join("");
  }

  function focusOtpIndex(i) {
    var inputs = getOtpInputs();
    if (inputs[i]) inputs[i].focus();
  }

  function wireOtpInputs() {
    var wrap = document.getElementById("otp-inputs");
    if (!wrap) return;

    wrap.addEventListener("paste", function (e) {
      e.preventDefault();
      var text = "";
      try {
        text = (e.clipboardData || window.clipboardData).getData("text") || "";
      } catch (err) {}
      var digits = String(text).replace(/\D/g, "").slice(0, OTP_LEN);
      var inputs = getOtpInputs();
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].value = digits[i] || "";
      }
      focusOtpIndex(Math.min(digits.length, OTP_LEN - 1));
    });

    wrap.addEventListener("input", function (e) {
      var input = e.target;
      if (!input.classList.contains("login-form__otp-digit")) return;
      var idx = parseInt(input.getAttribute("data-otp-index"), 10);
      if (isNaN(idx)) return;

      var raw = (input.value || "").replace(/\D/g, "");
      if (raw.length > 1) {
        var inputs = getOtpInputs();
        for (var i = 0; i < OTP_LEN; i++) {
          inputs[i].value = raw[i] || "";
        }
        focusOtpIndex(Math.min(raw.length, OTP_LEN - 1));
        return;
      }

      input.value = raw;
      if (raw && idx < OTP_LEN - 1) {
        focusOtpIndex(idx + 1);
      }
    });

    wrap.addEventListener("keydown", function (e) {
      var input = e.target;
      if (!input.classList.contains("login-form__otp-digit")) return;
      if (e.key !== "Backspace") return;
      var idx = parseInt(input.getAttribute("data-otp-index"), 10);
      if (isNaN(idx)) return;
      if (!input.value && idx > 0) {
        e.preventDefault();
        focusOtpIndex(idx - 1);
        getOtpInputs()[idx - 1].value = "";
      }
    });
  }

  function boot() {
    var sendBtn = document.getElementById("auth-send-code");
    var verifyBtn = document.getElementById("auth-verify-code");
    var phoneInput = document.getElementById("phone-number");
    var stepPhone = document.getElementById("login-step-phone");
    var stepCode = document.getElementById("login-step-code");
    var recaptchaContainer = document.getElementById("recaptcha-container");

    var confirmationResult = null;
    var recaptchaVerifier = null;

    wireOtpInputs();

    /** Show only phone + reCAPTCHA, or only OTP (after SMS send succeeds). */
    function setLoginStep(step) {
      if (!stepPhone || !stepCode) return;
      var showPhone = step === "phone";
      stepPhone.hidden = !showPhone;
      stepCode.hidden = showPhone;
    }

    setLoginStep("phone");

    function disableAll(disabled) {
      if (sendBtn) sendBtn.disabled = disabled;
      if (verifyBtn) verifyBtn.disabled = disabled;
      if (phoneInput) phoneInput.disabled = disabled;
      getOtpInputs().forEach(function (inp) {
        inp.disabled = disabled;
      });
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
            setLoginStep("code");
            clearOtp();
            focusOtpIndex(0);
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

    if (verifyBtn) {
      verifyBtn.addEventListener("click", function () {
        var code = getOtpCode();
        if (code.length < OTP_LEN) {
          showError("Enter the full 6-digit code.");
          return;
        }
        if (!confirmationResult) {
          showError("Request a new code from the poll site.");
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
            clearOtp();
            focusOtpIndex(0);
            showError(msg);
            setLoading(verifyBtn, false);
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
