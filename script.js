(function () {
  var STORAGE_KEY = "poll_dhuvaafaru_v1";

  var LABELS = {
    "1": "ފެނޭ",
    "2": "ނުފެނޭ",
  };

  var COLORS = {
    "1": "#ffffff",
    "2": "#6eb5ff",
  };

  var options = document.querySelectorAll(".poll__option");
  var barsEl = document.getElementById("results-bars");
  var totalEl = document.getElementById("results-total");

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {
          counts: { "1": 0, "2": 0 },
          lastChoice: null,
        };
      }
      var data = JSON.parse(raw);
      if (!data.counts) data.counts = { "1": 0, "2": 0 };
      if (data.counts["1"] == null) data.counts["1"] = 0;
      if (data.counts["2"] == null) data.counts["2"] = 0;
      return data;
    } catch (e) {
      return {
        counts: { "1": 0, "2": 0 },
        lastChoice: null,
      };
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function applyVote(optionId) {
    var state = loadState();
    var id = String(optionId);
    if (state.lastChoice === id) {
      return state;
    }
    if (state.lastChoice) {
      state.counts[state.lastChoice] = Math.max(
        0,
        (state.counts[state.lastChoice] || 0) - 1
      );
    }
    state.counts[id] = (state.counts[id] || 0) + 1;
    state.lastChoice = id;
    saveState(state);
    return state;
  }

  function syncSelectionFromStorage() {
    var state = loadState();
    if (!state.lastChoice) return;
    options.forEach(function (btn) {
      var oid = btn.getAttribute("data-option");
      var on = oid === state.lastChoice;
      btn.classList.toggle("poll__option--selected", on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  function renderResults() {
    var state = loadState();
    var c1 = state.counts["1"] || 0;
    var c2 = state.counts["2"] || 0;
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
        var count = state.counts[id] || 0;
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

  syncSelectionFromStorage();
  renderResults();

  options.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var optionId = btn.getAttribute("data-option");
      clearSelection();
      btn.classList.add("poll__option--selected");
      btn.setAttribute("aria-checked", "true");
      applyVote(optionId);
      renderResults();
    });

    btn.addEventListener("keydown", function (e) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        btn.click();
      }
    });
  });
})();
