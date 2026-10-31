// i18n.js — tiny FR/EN dictionary. No external library, no network call.
(function (global) {
  "use strict";

  var STRINGS = {
    en: {
      "app.title": "Subscription Leak Finder",
      "app.tagline": "Drop your bank statement. Find the subscriptions you forgot. Nothing leaves your browser.",
      "privacy.badge": "100% local — after this page loads, 0 network requests happen",
      "privacy.link": "How is that verified?",
      "drop.title": "Drop your bank statement here",
      "drop.sub": "CSV, OFX or QIF. Exported from your bank. Nothing is uploaded, nothing is sent anywhere.",
      "drop.button": "Choose a file…",
      "drop.sample": "Try with a sample statement",
      "drop.sampleNote": "(fictional demo data, clearly labeled)",
      "drop.formats": "Recognized formats: BNP Paribas, Société Générale, Crédit Agricole, Boursorama, Revolut, N26, Monzo, Chase, or any generic CSV.",
      "lang.toggle": "FR",
      "results.heading": "What we found",
      "results.monthly": "per month",
      "results.yearly": "per year",
      "results.count": "recurring charge(s) found",
      "results.table.merchant": "Merchant",
      "results.table.category": "Category",
      "results.table.frequency": "Frequency",
      "results.table.amount": "Amount",
      "results.table.monthly": "Monthly cost",
      "results.table.yearly": "Yearly cost",
      "results.table.status": "Flags",
      "results.table.cancel": "Cancel",
      "results.empty": "No recurring charges found in this statement. Either you have no subscriptions, or the file doesn't have enough history (we need at least 2-3 similar charges to detect a pattern).",
      "results.newFile": "Analyze another statement",
      "freq.weekly": "Weekly",
      "freq.monthly": "Monthly",
      "freq.quarterly": "Quarterly",
      "freq.annual": "Annual",
      "status.priceHike": "Price went up",
      "status.trial": "Free trial → paid",
      "status.duplicate": "Possible duplicate",
      "card.heading": "Share your recap",
      "card.title": "My Subscriptions, Wrapped",
      "card.hideAmounts": "Hide amounts (share safely)",
      "card.download": "Download image (PNG)",
      "card.subscriptionCount": "active subscriptions",
      "card.yearlyTotal": "per year",
      "card.topCategory": "Biggest category",
      "card.generatedBy": "Made with Subscription Leak Finder — 100% local, open source",
      "card.hiddenPlaceholder": "•••",
      "error.parse": "Couldn't read this file. Make sure it's a CSV, OFX or QIF export from your bank.",
      "error.empty": "This file doesn't contain any transactions we could read.",
      "footer.source": "Open source",
      "footer.privacy": "Privacy",
      "privacy.heading": "How your data stays private",
      "privacy.body": "This page is a static site with no backend. Once it has loaded (HTML, CSS, JS and the small merchant/format dictionaries), it makes no further network request. The file you drop is read with the browser's local File API and processed entirely in memory on your device. Open your browser's Network tab, drop a statement, and check for yourself: nothing new appears."
    },
    fr: {
      "app.title": "Chasseur d'abonnements oubliés",
      "app.tagline": "Dépose ton relevé bancaire. Retrouve les abonnements oubliés. Rien ne quitte ton navigateur.",
      "privacy.badge": "100% local — une fois la page chargée, 0 requête réseau",
      "privacy.link": "Comment c'est vérifié ?",
      "drop.title": "Dépose ton relevé bancaire ici",
      "drop.sub": "CSV, OFX ou QIF. Exporté depuis ta banque. Rien n'est envoyé nulle part.",
      "drop.button": "Choisir un fichier…",
      "drop.sample": "Essayer avec un relevé d'exemple",
      "drop.sampleNote": "(données fictives, clairement indiquées)",
      "drop.formats": "Formats reconnus : BNP Paribas, Société Générale, Crédit Agricole, Boursorama, Revolut, N26, Monzo, Chase, ou tout CSV générique.",
      "lang.toggle": "EN",
      "results.heading": "Ce qu'on a trouvé",
      "results.monthly": "par mois",
      "results.yearly": "par an",
      "results.count": "paiement(s) récurrent(s) trouvé(s)",
      "results.table.merchant": "Marchand",
      "results.table.category": "Catégorie",
      "results.table.frequency": "Fréquence",
      "results.table.amount": "Montant",
      "results.table.monthly": "Coût mensuel",
      "results.table.yearly": "Coût annuel",
      "results.table.status": "Alertes",
      "results.table.cancel": "Résilier",
      "results.empty": "Aucun paiement récurrent trouvé dans ce relevé. Soit tu n'as pas d'abonnement, soit le fichier manque d'historique (il faut au moins 2-3 paiements similaires pour détecter un motif).",
      "results.newFile": "Analyser un autre relevé",
      "freq.weekly": "Hebdomadaire",
      "freq.monthly": "Mensuel",
      "freq.quarterly": "Trimestriel",
      "freq.annual": "Annuel",
      "status.priceHike": "Le prix a augmenté",
      "status.trial": "Essai gratuit → payant",
      "status.duplicate": "Doublon possible",
      "card.heading": "Partage ton récap",
      "card.title": "Mes abonnements, le récap",
      "card.hideAmounts": "Masquer les montants (partage sans risque)",
      "card.download": "Télécharger l'image (PNG)",
      "card.subscriptionCount": "abonnements actifs",
      "card.yearlyTotal": "par an",
      "card.topCategory": "Plus grosse catégorie",
      "card.generatedBy": "Fait avec Subscription Leak Finder — 100% local, open source",
      "card.hiddenPlaceholder": "•••",
      "error.parse": "Impossible de lire ce fichier. Vérifie qu'il s'agit d'un export CSV, OFX ou QIF de ta banque.",
      "error.empty": "Ce fichier ne contient aucune transaction lisible.",
      "footer.source": "Code source",
      "footer.privacy": "Confidentialité",
      "privacy.heading": "Comment tes données restent privées",
      "privacy.body": "Cette page est un site statique sans serveur. Une fois chargée (HTML, CSS, JS et les petits dictionnaires marchands/formats), elle ne fait plus aucune requête réseau. Le fichier que tu déposes est lu avec l'API File locale du navigateur et traité entièrement en mémoire sur ton appareil. Ouvre l'onglet Réseau de ton navigateur, dépose un relevé, et vérifie toi-même : rien de nouveau n'apparaît."
    }
  };

  function detectLang() {
    try {
      var saved = localStorage.getItem("slf_lang");
      if (saved === "en" || saved === "fr") return saved;
    } catch (e) {}
    var nav = (navigator.language || "en").toLowerCase();
    return nav.indexOf("fr") === 0 ? "fr" : "en";
  }

  var currentLang = detectLang();

  function t(key) {
    var dict = STRINGS[currentLang] || STRINGS.en;
    return dict[key] || STRINGS.en[key] || key;
  }

  function setLang(lang) {
    currentLang = lang === "fr" ? "fr" : "en";
    try {
      localStorage.setItem("slf_lang", currentLang);
    } catch (e) {}
    document.documentElement.setAttribute("lang", currentLang);
    applyTranslations();
  }

  function getLang() {
    return currentLang;
  }

  function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    document.title = t("app.title") + " — " + t("app.tagline");
  }

  global.SLF_I18N = { t: t, setLang: setLang, getLang: getLang, applyTranslations: applyTranslations };
})(window);
