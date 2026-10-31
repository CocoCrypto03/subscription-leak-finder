// merchants.js — cleans raw bank descriptions and matches them against the
// known-merchant dictionary (data/merchants.json). Unknown merchants still
// get a normalized name so recurrence detection works on anything.
(function (global) {
  "use strict";

  var NOISE_PATTERNS = [
    /\bcb\s*\*/gi,
    /\bcarte\s+bancaire\b/gi,
    /\bpaiement\s+cb\b/gi,
    /\bachat\s+cb\b/gi,
    /\bprlv(\s+sepa)?\b/gi,
    /\bprelevement(\s+sepa)?\b/gi,
    /\bvir(ement)?(\s+sepa)?\b/gi,
    /\bdirect\s+debit\b/gi,
    /\bcard\s+payment(\s+to)?\b/gi,
    /\bpos\s+purchase\b/gi,
    /\bcontactless\b/gi,
    /\bpurchase\b/gi,
    /\b\d{2}\/\d{2}(\/\d{2,4})?\b/g, // embedded dates
    /\b\d{4,}\b/g, // long reference numbers / store codes
    /\*{2,}\d*/g
  ];

  function cleanDescription(raw) {
    var s = String(raw || "");
    NOISE_PATTERNS.forEach(function (re) {
      s = s.replace(re, " ");
    });
    s = s
      .replace(/[_#*]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return s;
  }

  function titleCase(s) {
    return s
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .slice(0, 4)
      .map(function (w) {
        return w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(" ");
  }

  function buildIndex(merchantsJson) {
    var list = (merchantsJson && merchantsJson.merchants) || [];
    return list.map(function (m) {
      return {
        normalized: m.normalized,
        category: m.category,
        cancelUrl: m.cancelUrl || null,
        match: (m.match || []).map(function (x) {
          return x.toLowerCase();
        })
      };
    });
  }

  function matchMerchant(rawDescription, index) {
    var cleaned = cleanDescription(rawDescription);
    var lower = (" " + rawDescription + " " + cleaned).toLowerCase();
    for (var i = 0; i < index.length; i++) {
      var entry = index[i];
      for (var j = 0; j < entry.match.length; j++) {
        if (lower.indexOf(entry.match[j]) !== -1) {
          return { normalized: entry.normalized, category: entry.category, cancelUrl: entry.cancelUrl, known: true };
        }
      }
    }
    var guess = titleCase(cleaned) || titleCase(rawDescription) || "Unknown merchant";
    return { normalized: guess, category: "other", cancelUrl: null, known: false };
  }

  global.SLF_MERCHANTS = {
    buildIndex: buildIndex,
    matchMerchant: matchMerchant,
    cleanDescription: cleanDescription
  };
})(window);
