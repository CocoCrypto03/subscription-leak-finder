// app.js — wires the DOM to parsers.js / merchants.js / detect.js / card.js.
// Everything in this file runs client-side only. The only network calls the
// whole app ever makes are the two fetch() calls in loadData(), which load
// this app's own bundled data/format JSON at page load time — never the
// user's statement, and never anything after that point.
(function () {
  "use strict";

  var state = {
    merchantsIndex: [],
    formatDefs: [],
    lastResult: null,
    isSample: false
  };

  var FALLBACK_FORMATS = [{ id: "generic-csv", label: "Generic CSV (auto-detected columns)", heuristic: true }];

  function $(id) {
    return document.getElementById(id);
  }

  // ---------- Data loading (own static assets only, at page load) ----------

  function loadData() {
    var merchantsPromise = fetch("data/merchants.json")
      .then(function (r) {
        return r.json();
      })
      .then(function (json) {
        state.merchantsIndex = window.SLF_MERCHANTS.buildIndex(json);
      })
      .catch(function () {
        state.merchantsIndex = [];
      });

    var formatsPromise = fetch("formats/index.json")
      .then(function (r) {
        return r.json();
      })
      .then(function (idx) {
        return Promise.all(
          idx.files.map(function (f) {
            return fetch("formats/" + f)
              .then(function (r) {
                return r.json();
              })
              .catch(function () {
                return null;
              });
          })
        );
      })
      .then(function (defs) {
        state.formatDefs = defs.filter(Boolean);
        if (state.formatDefs.length === 0) state.formatDefs = FALLBACK_FORMATS;
      })
      .catch(function () {
        state.formatDefs = FALLBACK_FORMATS;
      });

    return Promise.all([merchantsPromise, formatsPromise]);
  }

  // ---------- Fictional sample statement (clearly labeled, built in-memory) ----------

  function buildSampleCsv() {
    var today = new Date();
    function minusDays(n) {
      var d = new Date(today);
      d.setDate(d.getDate() - n);
      return d;
    }
    function fmt(d) {
      return d.toISOString().slice(0, 10);
    }
    var rows = [["Date", "Description", "Amount"]];
    function add(daysAgo, desc, amount) {
      rows.push([fmt(minusDays(daysAgo)), desc, amount.toFixed(2)]);
    }

    // Netflix: 14 monthly charges, price hike after month 8 (13.49 -> 15.49).
    for (var m = 13; m >= 0; m--) {
      add(m * 30, "NETFLIX.COM CB*1234", m <= 5 ? -15.49 : -13.49);
    }
    // Spotify: steady monthly.
    for (var s = 11; s >= 0; s--) {
      add(s * 30 + 3, "SPOTIFY P1A2B3", -9.99);
    }
    // Disney+: steady monthly (same category as Netflix -> duplicate flag).
    for (var dp = 9; dp >= 0; dp--) {
      add(dp * 30 + 10, "DISNEY PLUS", -8.99);
    }
    // Amazon Prime: two annual charges, price hike 49.99 -> 69.99.
    add(370, "AMAZON PRIME FR", -49.99);
    add(5, "AMAZON PRIME FR", -69.99);
    // FitApp: free trial then paid monthly (trial -> paid detector). Same
    // merchant description every time, like a real bank statement would show.
    add(200, "FITAPP INC", 0.0);
    for (var f2 = 5; f2 >= 0; f2--) {
      add(f2 * 30 + 20, "FITAPP INC", -12.99);
    }
    // One-off, non-recurring purchases that should NOT be flagged as subscriptions.
    // (Offsets chosen to not collide with any recurring series above — a same-day
    // collision would merge an unrelated purchase into a subscription's date chain.)
    add(37, "CARREFOUR MARKET PARIS", -54.2);
    add(17, "SNCF CONNECT", -89.0);
    add(5, "RESTAURANT LE BISTROT", -31.5);

    rows.sort(function (a, b) {
      return new Date(a[0]) - new Date(b[0]);
    });
    return rows.map(function (r) {
      return r.join(",");
    }).join("\n");
  }

  // ---------- Core pipeline: text -> transactions -> enriched -> detection ----------

  function analyzeText(filename, text) {
    var parsed = window.SLF_PARSERS.parseStatement(filename, text, state.formatDefs);
    if (!parsed.transactions || parsed.transactions.length === 0) {
      throw new Error("empty");
    }
    var enriched = parsed.transactions.map(function (tx) {
      var m = window.SLF_MERCHANTS.matchMerchant(tx.description, state.merchantsIndex);
      return {
        date: tx.date,
        amount: tx.amount,
        description: tx.description,
        merchant: m.normalized,
        category: m.category,
        cancelUrl: m.cancelUrl,
        known: m.known
      };
    });
    var result = window.SLF_DETECT.detectSubscriptions(enriched);
    result.formatUsed = parsed.formatUsed;
    result.transactionCount = enriched.length;
    return result;
  }

  // ---------- Rendering ----------

  function money(n) {
    return (Math.round(n * 100) / 100).toFixed(2).replace(".", ",") + " €";
  }

  function freqLabel(key) {
    return window.SLF_I18N.t("freq." + key);
  }

  function renderResults(result) {
    state.lastResult = result;
    var t = window.SLF_I18N.t;

    $("totalMonthly").textContent = money(result.totals.monthly);
    $("totalYearly").textContent = money(result.totals.yearly);
    $("totalCount").textContent = String(result.subscriptions.length);

    $("sampleFlag").hidden = !state.isSample;
    if (state.isSample) {
      $("sampleFlag").textContent =
        (window.SLF_I18N.getLang() === "fr"
          ? "Exemple de démonstration — données fictives, pas tes vraies données."
          : "Demo example — fictional data, not your real statement.");
    }

    var body = $("resultsBody");
    body.innerHTML = "";

    if (result.subscriptions.length === 0) {
      $("emptyState").hidden = false;
      $("resultsTable").hidden = true;
      $("cardSection").hidden = true;
    } else {
      $("emptyState").hidden = true;
      $("resultsTable").hidden = false;
      $("cardSection").hidden = false;

      result.subscriptions.forEach(function (s) {
        var tr = document.createElement("tr");

        var tdMerchant = document.createElement("td");
        tdMerchant.textContent = s.merchant;
        if (!s.known) tdMerchant.title = "Guessed from the statement description";
        tr.appendChild(tdMerchant);

        var tdCat = document.createElement("td");
        var catPill = document.createElement("span");
        catPill.className = "pill pill-cat pill-cat-" + s.category;
        catPill.textContent = s.category.replace(/-/g, " ");
        tdCat.appendChild(catPill);
        tr.appendChild(tdCat);

        var tdFreq = document.createElement("td");
        tdFreq.textContent = freqLabel(s.frequency);
        tr.appendChild(tdFreq);

        var tdMonthly = document.createElement("td");
        tdMonthly.textContent = money(s.monthlyEquivalent);
        tr.appendChild(tdMonthly);

        var tdYearly = document.createElement("td");
        tdYearly.textContent = money(s.yearlyEquivalent);
        tdYearly.className = "yearly-cell";
        tr.appendChild(tdYearly);

        var tdFlags = document.createElement("td");
        tdFlags.className = "flags-cell";
        if (s.priceHikes.length > 0) {
          var hike = document.createElement("span");
          hike.className = "flag flag-hike";
          hike.textContent = "▲ " + t("status.priceHike");
          hike.title = s.priceHikes
            .map(function (h) {
              return money(h.fromAmount) + " → " + money(h.toAmount) + " (+" + Math.round(h.pctChange) + "%)";
            })
            .join(", ");
          tdFlags.appendChild(hike);
        }
        if (s.trial) {
          var trialFlag = document.createElement("span");
          trialFlag.className = "flag flag-trial";
          trialFlag.textContent = "🎁 " + t("status.trial");
          tdFlags.appendChild(trialFlag);
        }
        if (s.isDuplicate) {
          var dupFlag = document.createElement("span");
          dupFlag.className = "flag flag-duplicate";
          dupFlag.textContent = "⚠ " + t("status.duplicate");
          dupFlag.title = "Also: " + s.duplicateWith.join(", ");
          tdFlags.appendChild(dupFlag);
        }
        tr.appendChild(tdFlags);

        var tdCancel = document.createElement("td");
        if (s.cancelUrl) {
          var a = document.createElement("a");
          a.href = s.cancelUrl;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.className = "cancel-link";
          a.textContent = t("results.table.cancel");
          tdCancel.appendChild(a);
        } else {
          tdCancel.textContent = "—";
        }
        tr.appendChild(tdCancel);

        body.appendChild(tr);
      });

      renderCardPreview();
    }

    $("intro").hidden = true;
    $("results").hidden = false;
  }

  function renderCardPreview() {
    if (!state.lastResult) return;
    var canvas = $("recapCanvas");
    var hide = $("hideAmountsCheckbox").checked;
    window.SLF_CARD.renderCard(canvas, state.lastResult, { hideAmounts: hide, t: window.SLF_I18N.t });
  }

  function showError(key) {
    var box = $("errorBox");
    box.textContent = window.SLF_I18N.t(key);
    box.hidden = false;
  }

  function hideError() {
    $("errorBox").hidden = true;
  }

  function resetToIntro() {
    $("intro").hidden = false;
    $("results").hidden = true;
    $("fileInput").value = "";
    hideError();
    state.isSample = false;
  }

  // ---------- File handling ----------

  function handleFileObject(file) {
    hideError();
    state.isSample = false;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var result = analyzeText(file.name, String(reader.result));
        renderResults(result);
      } catch (e) {
        showError(e.message === "empty" ? "error.empty" : "error.parse");
      }
    };
    reader.onerror = function () {
      showError("error.parse");
    };
    reader.readAsText(file);
  }

  function handleSample() {
    hideError();
    state.isSample = true;
    try {
      var csv = buildSampleCsv();
      var result = analyzeText("sample-statement.csv", csv);
      renderResults(result);
    } catch (e) {
      showError("error.parse");
    }
  }

  // ---------- Wiring ----------

  function wireEvents() {
    var dropzone = $("dropzone");
    var fileInput = $("fileInput");

    $("chooseFileBtn").addEventListener("click", function () {
      fileInput.click();
    });
    dropzone.addEventListener("click", function (e) {
      if (e.target.closest("button")) return;
      fileInput.click();
    });
    dropzone.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fileInput.click();
      }
    });
    fileInput.addEventListener("change", function () {
      if (fileInput.files && fileInput.files[0]) handleFileObject(fileInput.files[0]);
    });

    ["dragenter", "dragover"].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) {
        e.preventDefault();
        dropzone.classList.add("dragover");
      });
    });
    ["dragleave", "drop"].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) {
        e.preventDefault();
        dropzone.classList.remove("dragover");
      });
    });
    dropzone.addEventListener("drop", function (e) {
      var files = e.dataTransfer && e.dataTransfer.files;
      if (files && files[0]) handleFileObject(files[0]);
    });

    $("sampleBtn").addEventListener("click", handleSample);
    $("newFileBtn").addEventListener("click", resetToIntro);

    $("langToggle").addEventListener("click", function () {
      var next = window.SLF_I18N.getLang() === "fr" ? "en" : "fr";
      window.SLF_I18N.setLang(next);
      $("langToggle").textContent = next === "fr" ? "EN" : "FR";
      if (state.lastResult) renderResults(state.lastResult);
    });

    $("hideAmountsCheckbox").addEventListener("change", renderCardPreview);

    $("downloadCardBtn").addEventListener("click", function () {
      var canvas = $("recapCanvas");
      var link = document.createElement("a");
      link.download = "subscriptions-wrapped.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    });

    $("privacyLink").addEventListener("click", function () {
      $("privacyModal").hidden = false;
    });
    $("closePrivacyModal").addEventListener("click", function () {
      $("privacyModal").hidden = true;
    });
  }

  function init() {
    window.SLF_I18N.applyTranslations();
    $("langToggle").textContent = window.SLF_I18N.getLang() === "fr" ? "EN" : "FR";
    wireEvents();
    loadData();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
