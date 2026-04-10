(function () {
  var COLLECTION_VOTES = "poll_dhuvaafaru_votes";
  var COLLECTION_META = "poll_dhuvaafaru_meta";
  var DOC_STATS = "stats";

  var LABELS = {
    "1": "އާއެކެވެ.",
    "2": "ނޫނެކެވެ.",
  };

  var COLORS = {
    "1": "#ffffff",
    "2": "#6eb5ff",
  };

  var MSG_ALREADY_VOTED =
    "ވޯޓް ލެވިއްޖެ. ވޯޓް ބަދަލެއް ނުކުރެވޭނެ.";
  var MSG_VOTE_FAILED =
    "ވޯޓު ލައްވާ ނުކުރެވުނު. އަލުން މަސައްކަތް ކުރައްވާ.";
  var MSG_PERMISSION =
    "ވޯޓު ސޭވް ކުރެވުނު (ޕަރމިޝަން). ފަޔަރބޭސް ރޫލްސް ޑިޕްލޮއި ކޮށް އަލުން މަސައްކަތް ކުރައްވާ.";

  var options = document.querySelectorAll(".poll__option");
  var optionsWrap = document.querySelector(".poll__options");
  var barsEl = document.getElementById("results-bars");
  var totalEl = document.getElementById("results-total");
  var pollStatusEl = document.getElementById("poll-status");

  var locked = false;
  var currentUser = null;
  var unsubVote = null;
  var unsubStats = null;
  var optionsBound = false;

  function showPollStatus(text) {
    if (!pollStatusEl) return;
    if (text) {
      pollStatusEl.textContent = text;
      pollStatusEl.hidden = false;
    } else {
      pollStatusEl.textContent = "";
      pollStatusEl.hidden = true;
    }
  }

  function openVoteAuthModal() {
    var d = document.getElementById("vote-auth-modal");
    if (d && typeof d.showModal === "function") {
      try {
        d.showModal();
        return;
      } catch (e) {
        console.error(e);
      }
    }
    window.location.href = "login.html?next=index.html";
  }

  function wireVoteAuthModal() {
    var modal = document.getElementById("vote-auth-modal");
    var closeBtn = document.getElementById("vote-auth-modal-close");
    if (closeBtn && modal) {
      closeBtn.addEventListener("click", function () {
        if (typeof modal.close === "function") modal.close();
      });
    }
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal && typeof modal.close === "function") {
          modal.close();
        }
      });
    }
  }

  function renderResults(counts) {
    var c1 = counts["1"] || 0;
    var c2 = counts["2"] || 0;
    var total = c1 + c2;

    if (totalEl) {
      totalEl.textContent =
        total === 0
          ? "އަދި ވޯޓެއް ނޫން — ވޯޓު ލައްވާ ނަތީޖާ ބަލާށެވެ"
          : "ޖުމްލަ ވޯޓް: " + total;
    }

    if (barsEl) {
      barsEl.innerHTML = "";
      ["1", "2"].forEach(function (id) {
        var count = counts[id] || 0;
        var pct = total === 0 ? 0 : (count / total) * 100;
        var row = document.createElement("div");
        row.className = "results__bar-row";
        row.innerHTML =
          '<span class="results__bar-label">' +
          LABELS[id] +
          '</span>' +
          '<div class="results__bar-track" role="presentation">' +
          '<div class="results__bar-fill" style="width:' +
          pct +
          "%;background:" +
          COLORS[id] +
          '"></div></div>' +
          '<span class="results__bar-meta">' +
          count +
          " &middot; " +
          (total === 0 ? "0" : Math.round((count / total) * 1000) / 10) +
          "%</span>";
        barsEl.appendChild(row);
      });
    }
  }

  function clearSelection() {
    options.forEach(function (btn) {
      btn.classList.remove("poll__option--selected");
      btn.setAttribute("aria-checked", "false");
    });
  }

  function syncSelection(choiceId) {
    if (!choiceId) return;
    options.forEach(function (btn) {
      var oid = btn.getAttribute("data-option");
      var on = oid === String(choiceId);
      btn.classList.toggle("poll__option--selected", on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  function setVotedState(hasVoted, choice) {
    locked = hasVoted;
    if (optionsWrap) {
      optionsWrap.classList.toggle("poll__options--locked", hasVoted);
    }
    options.forEach(function (btn) {
      btn.disabled = hasVoted;
      btn.setAttribute("aria-disabled", hasVoted ? "true" : "false");
    });
    if (hasVoted && choice) {
      syncSelection(choice);
      showPollStatus(MSG_ALREADY_VOTED);
    } else {
      clearSelection();
      showPollStatus("");
    }
  }

  function teardownVoteListener() {
    if (unsubVote) {
      unsubVote();
      unsubVote = null;
    }
  }

  function setupStatsListener() {
    if (unsubStats) return;
    if (typeof firebase === "undefined" || !firebase.firestore) {
      showPollStatus(
        "ޑޭޓާބޭސް ލޯޑް ނުވި. ޞަފްޙާ ބޭނުންކުރާ ފަރާތަށް ގުޅޭ."
      );
      return;
    }

    var db = firebase.firestore();
    var statsRef = db.collection(COLLECTION_META).doc(DOC_STATS);

    unsubStats = statsRef.onSnapshot(
      function (snap) {
        var counts = { "1": 0, "2": 0 };
        if (snap.exists) {
          var d = snap.data();
          if (d && d.counts) {
            counts["1"] = d.counts["1"] || 0;
            counts["2"] = d.counts["2"] || 0;
          }
        }
        renderResults(counts);
      },
      function (err) {
        console.error(err);
        renderResults({ "1": 0, "2": 0 });
      }
    );
  }

  function bootPoll(user) {
    if (typeof firebase === "undefined" || !firebase.firestore) {
      showPollStatus(
        "ޑޭޓާބޭސް ލޯޑް ނުވި. ޞަފްޙާ ބޭނުންކުރާ ފަރާތަށް ގުޅޭ."
      );
      return;
    }

    teardownVoteListener();

    var db = firebase.firestore();
    var uid = user.uid;
    var voteRef = db.collection(COLLECTION_VOTES).doc(uid);

    unsubVote = voteRef.onSnapshot(
      function (snap) {
        if (snap.exists) {
          var data = snap.data();
          var choice = data && data.choice ? String(data.choice) : null;
          setVotedState(true, choice);
        } else {
          setVotedState(false, null);
        }
      },
      function (err) {
        console.error(err);
        showPollStatus(MSG_VOTE_FAILED);
      }
    );
  }

  function bindOptionClicks() {
    if (optionsBound) return;
    optionsBound = true;

    options.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (locked) return;
        var optionId = btn.getAttribute("data-option");
        if (!optionId) return;

        var authed =
          currentUser &&
          (currentUser.phoneNumber || currentUser.email);
        if (!authed) {
          openVoteAuthModal();
          return;
        }

        if (typeof firebase === "undefined" || !firebase.firestore) {
          showPollStatus(MSG_VOTE_FAILED);
          return;
        }

        var id = String(optionId);
        var db = firebase.firestore();
        var voteRef = db.collection(COLLECTION_VOTES).doc(currentUser.uid);
        var statsRef = db.collection(COLLECTION_META).doc(DOC_STATS);

        db.runTransaction(function (transaction) {
          return transaction.get(voteRef).then(function (voteSnap) {
            if (voteSnap.exists) {
              throw new Error("already-voted");
            }
            return transaction.get(statsRef).then(function (statsSnap) {
              var c1 = 0;
              var c2 = 0;
              if (statsSnap.exists) {
                var c = statsSnap.data().counts || {};
                c1 = c["1"] || 0;
                c2 = c["2"] || 0;
              }
              if (id === "1") {
                c1 += 1;
              } else {
                c2 += 1;
              }
              transaction.set(voteRef, { choice: id });
              transaction.set(
                statsRef,
                { counts: { "1": c1, "2": c2 } },
                { merge: true }
              );
            });
          });
        }).catch(function (err) {
          if (err && err.message === "already-voted") {
            return;
          }
          console.error("poll vote transaction", err && err.code, err);
          if (err && err.code === "permission-denied") {
            showPollStatus(MSG_PERMISSION);
          } else {
            showPollStatus(MSG_VOTE_FAILED);
          }
        });
      });

      btn.addEventListener("keydown", function (e) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          if (!locked) btn.click();
        }
      });
    });
  }

  function init() {
    if (typeof firebase === "undefined") {
      return;
    }

    wireVoteAuthModal();
    setupStatsListener();
    bindOptionClicks();

    firebase.auth().onAuthStateChanged(function (user) {
      teardownVoteListener();
      currentUser = user;
      locked = false;

      if (!user || (!user.email && !user.phoneNumber)) {
        clearSelection();
        showPollStatus("");
        options.forEach(function (btn) {
          btn.disabled = false;
          btn.setAttribute("aria-disabled", "false");
        });
        if (optionsWrap) {
          optionsWrap.classList.remove("poll__options--locked");
        }
        return;
      }

      bootPoll(user);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
