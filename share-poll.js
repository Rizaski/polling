(function () {
  var SHARE_TITLE = "Dhuvaafaru Polls - Speak Up!";
  var SHARE_TEXT =
    "އައްސަލާމް އަލައިކުމް! މި ޕޯލުގައި ވޯޓް ދެއްވާ — Dhuvaafaru Polls";

  function getShareUrl() {
    return window.location.href.split("#")[0];
  }

  function encode(s) {
    return encodeURIComponent(s);
  }

  function showToast(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(el._toastTimer);
    el._toastTimer = setTimeout(function () {
      el.hidden = true;
    }, 2600);
  }

  function openShare(href) {
    window.open(href, "_blank", "noopener,noreferrer");
  }

  function bindShare() {
    var toast = document.getElementById("share-toast");
    var nativeBtn = document.getElementById("share-native");
    var urlDisplay = document.getElementById("share-canonical-display");

    if (urlDisplay) {
      urlDisplay.textContent = getShareUrl().replace(/^https?:\/\//, "");
    }

    if (nativeBtn) {
      if (typeof navigator.share === "function") {
        nativeBtn.hidden = false;
        nativeBtn.addEventListener("click", function () {
          navigator
            .share({
              title: SHARE_TITLE,
              text: SHARE_TEXT,
              url: getShareUrl(),
            })
            .catch(function () {});
        });
      } else {
        nativeBtn.hidden = true;
      }
    }

    document.querySelectorAll("[data-share]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        var kind = el.getAttribute("data-share");
        var url = getShareUrl();
        var title = SHARE_TITLE;
        var text = SHARE_TEXT + " " + url;

        if (kind === "copy") {
          e.preventDefault();
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(
              function () {
                showToast(toast, "ލިންކް ކޮޕީ ކުރެވިއްޖެ");
              },
              function () {
                showToast(toast, "ކޮޕީ ނުކުރެވުނު");
              }
            );
          } else {
            showToast(toast, url);
          }
          return;
        }

        var href = "";
        if (kind === "facebook") {
          href =
            "https://www.facebook.com/sharer/sharer.php?u=" + encode(url);
        } else if (kind === "twitter") {
          href =
            "https://twitter.com/intent/tweet?text=" +
            encode(text) +
            "&url=" +
            encode(url);
        } else if (kind === "whatsapp") {
          href = "https://wa.me/?text=" + encode(text);
        } else if (kind === "telegram") {
          href =
            "https://t.me/share/url?url=" +
            encode(url) +
            "&text=" +
            encode(SHARE_TITLE);
        } else if (kind === "linkedin") {
          href =
            "https://www.linkedin.com/sharing/share-offsite/?url=" +
            encode(url);
        } else if (kind === "reddit") {
          href =
            "https://www.reddit.com/submit?url=" +
            encode(url) +
            "&title=" +
            encode(title);
        } else if (kind === "email") {
          href =
            "mailto:?subject=" +
            encode(title) +
            "&body=" +
            encode(text);
        }

        if (href) {
          e.preventDefault();
          openShare(href);
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindShare);
  } else {
    bindShare();
  }
})();
