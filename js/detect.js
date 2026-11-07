// detect.js – the actual leak-finding logic: recurring charges, price hikes,
// free-trial-to-paid, and category duplicates. Pure data in, data out – no
// DOM, no network, easy to unit-test from the console.
(function (global) {
  "use strict";

  var INTERVALS = [
    { key: "weekly", days: 7, tolerance: 2, perYear: 52 },
    { key: "monthly", days: 30.44, tolerance: 4, perYear: 12 },
    { key: "quarterly", days: 91.3, tolerance: 7, widerTolerance: 10, perYear: 4 },
    { key: "annual", days: 365.25, tolerance: 12, perYear: 1 }
  ];

  var MIN_OCCURRENCES = { weekly: 3, monthly: 3, quarterly: 2, annual: 2 };

  var DUPLICATE_PRONE_CATEGORIES = [
    "video-streaming",
    "music-streaming",
    "cloud-storage",
    "fitness",
    "news-reading"
  ];

  function daysBetween(a, b) {
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  function hasQuarterlyCorroboration(prevTx, nextTx) {
    if (!prevTx || !nextTx) return false;
    var prevAmt = Math.abs(prevTx.amount);
    var nextAmt = Math.abs(nextTx.amount);
    if (prevAmt <= 0 || nextAmt <= 0) return false;
    var sameAmount = Math.abs(prevAmt - nextAmt) < 0.01;
    var cents = Math.round((nextAmt % 1) * 100);
    var subscriptionLikePrice =
      cents === 0 || cents === 99 || cents === 95 || cents === 90 || cents === 50;
    return sameAmount || (Boolean(prevTx.known) && subscriptionLikePrice);
  }

  function matchInterval(gapDays, prevTx, nextTx) {
    for (var i = 0; i < INTERVALS.length; i++) {
      var iv = INTERVALS[i];
      var diff = Math.abs(gapDays - iv.days);
      if (diff <= iv.tolerance) return iv;
      if (
        iv.key === "quarterly" &&
        iv.widerTolerance &&
        diff <= iv.widerTolerance &&
        hasQuarterlyCorroboration(prevTx, nextTx)
      ) {
        return iv;
      }
    }
    return null;
  }

  function groupByMerchant(transactions) {
    var groups = {};
    transactions.forEach(function (tx) {
      if (!groups[tx.merchant]) groups[tx.merchant] = [];
      groups[tx.merchant].push(tx);
    });
    Object.keys(groups).forEach(function (k) {
      groups[k].sort(function (a, b) {
        return a.date - b.date;
      });
    });
    return groups;
  }

  function buildChains(group) {
    if (group.length === 0) return [];
    var chains = [];
    var current = [group[0]];
    var currentKey = null;
    for (var i = 1; i < group.length; i++) {
      var gap = daysBetween(group[i - 1].date, group[i].date);
      var iv = matchInterval(gap, group[i - 1], group[i]);
      if (iv && (currentKey === null || iv.key === currentKey)) {
        current.push(group[i]);
        currentKey = iv.key;
      } else {
        chains.push({
          key: currentKey,
          txs: current,
          startsAtGroupHead: current[0] === group[0]
        });
        current = [group[i]];
        currentKey = null;
      }
    }
    chains.push({
      key: currentKey,
      txs: current,
      startsAtGroupHead: current[0] === group[0]
    });
    return chains.filter(function (c) {
      return c.key && c.txs.length >= (MIN_OCCURRENCES[c.key] || 2);
    });
  }

  function intervalByKey(key) {
    return INTERVALS.filter(function (iv) {
      return iv.key === key;
    })[0];
  }

  function detectPriceHikes(chain) {
    var hikes = [];
    for (var i = 1; i < chain.txs.length; i++) {
      var prev = Math.abs(chain.txs[i - 1].amount);
      var next = Math.abs(chain.txs[i].amount);
      if (prev <= 0) continue;
      var pct = ((next - prev) / prev) * 100;
      if (pct > 3) {
        hikes.push({
          date: chain.txs[i].date,
          fromAmount: prev,
          toAmount: next,
          pctChange: pct
        });
      }
    }
    return hikes;
  }

  function detectTrial(chain) {
    if (!chain.startsAtGroupHead || chain.txs.length < 2) return null;
    var first = Math.abs(chain.txs[0].amount);
    var second = Math.abs(chain.txs[1].amount);
    if (second <= 0) return null;
    if (first <= 1.0 || first < second * 0.5) {
      return {
        trialAmount: first,
        trialDays: daysBetween(chain.txs[0].date, chain.txs[1].date)
      };
    }
    return null;
  }

  function detectSubscriptions(transactions) {
    // <= 0, not just < 0: some free-trial sign-ups post a $0.00 line before
    // the first real charge, and we want that row for trial-to-paid detection.
    var expenses = transactions.filter(function (tx) {
      return tx.amount <= 0;
    });
    if (expenses.length === 0)
      return {
        subscriptions: [],
        totals: { monthly: 0, yearly: 0 },
        maxDate: null
      };

    var maxDate = expenses.reduce(function (m, tx) {
      return tx.date > m ? tx.date : m;
    }, expenses[0].date);

    var groups = groupByMerchant(expenses);
    var subscriptions = [];

    Object.keys(groups).forEach(function (merchantName) {
      var group = groups[merchantName];
      var chains = buildChains(group);
      // Keep only the most recent qualifying chain per merchant (the current subscription state).
      if (chains.length === 0) return;
      var chain = chains[chains.length - 1];
      var iv = intervalByKey(chain.key);
      var lastTx = chain.txs[chain.txs.length - 1];
      var firstTx = chain.txs[0];
      var currentAmount = Math.abs(lastTx.amount);
      var monthlyEquivalent = (currentAmount * iv.perYear) / 12;
      var yearlyEquivalent = currentAmount * iv.perYear;
      var hikes = detectPriceHikes(chain);
      var trial = detectTrial(chain);
      var activeGapDays = daysBetween(lastTx.date, maxDate);
      var isActive = activeGapDays <= iv.days * 1.5;

      subscriptions.push({
        merchant: merchantName,
        category: group[0].category,
        cancelUrl: group[0].cancelUrl,
        known: group[0].known,
        frequency: chain.key,
        amount: currentAmount,
        occurrences: chain.txs.length,
        firstDate: firstTx.date,
        lastDate: lastTx.date,
        monthlyEquivalent: monthlyEquivalent,
        yearlyEquivalent: yearlyEquivalent,
        priceHikes: hikes,
        trial: trial,
        isActive: isActive,
        isDuplicate: false,
        duplicateWith: []
      });
    });

    // Duplicate detection: >=2 active subscriptions in the same "duplicate-prone" category.
    var byCategory = {};
    subscriptions.forEach(function (s) {
      if (!s.isActive) return;
      if (DUPLICATE_PRONE_CATEGORIES.indexOf(s.category) === -1) return;
      byCategory[s.category] = byCategory[s.category] || [];
      byCategory[s.category].push(s);
    });
    Object.keys(byCategory).forEach(function (cat) {
      var members = byCategory[cat];
      if (members.length < 2) return;
      members.forEach(function (s) {
        s.isDuplicate = true;
        s.duplicateWith = members
          .filter(function (o) {
            return o !== s;
          })
          .map(function (o) {
            return o.merchant;
          });
      });
    });

    subscriptions.sort(function (a, b) {
      return b.yearlyEquivalent - a.yearlyEquivalent;
    });

    var totalMonthly = subscriptions.reduce(function (sum, s) {
      return sum + s.monthlyEquivalent;
    }, 0);
    var totalYearly = subscriptions.reduce(function (sum, s) {
      return sum + s.yearlyEquivalent;
    }, 0);

    return {
      subscriptions: subscriptions,
      totals: { monthly: totalMonthly, yearly: totalYearly },
      maxDate: maxDate
    };
  }

  global.SLF_DETECT = {
    detectSubscriptions: detectSubscriptions,
    matchInterval: matchInterval,
    INTERVALS: INTERVALS
  };
})(window);
