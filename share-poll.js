(function () {
  var PUBLIC_SITE_URL = "https://dhuvaafaru-polls.vercel.app/";
  var SHARE_TITLE = "Dhuvaafaru Polls - Speak Up!";
  var SHARE_TEXT =
    "އައްސަލާމް އަލައިކުމް! މި ޕޯލުގައި ވޯޓް ދެއްވާ — Dhuvaafaru Polls";

  function getShareUrl() {
    return PUBLIC_SITE_URL.replace(/\/?$/, "/");
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
    var urlDisplay = document.getElementById("share-canonical-display");

    if (urlDisplay) {
      urlDisplay.textContent = getShareUrl();
    }

    document.querySelectorAll("[data-share]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        var kind = el.getAttribute("data-share");
        var url = getShareUrl();
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
