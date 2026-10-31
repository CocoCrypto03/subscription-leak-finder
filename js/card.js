// card.js — draws the shareable "Wrapped" recap image on a <canvas>.
// Pure canvas 2D, no external image/font loading (system font stack only),
// so it works offline and the hide-amounts option never touches a server.
(function (global) {
  "use strict";

  var W = 1080;
  var H = 1350;

  function formatMoney(n, hidden, placeholder) {
    if (hidden) return placeholder;
    return (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)) + " €";
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function renderCard(canvas, payload, opts) {
    opts = opts || {};
    var hidden = !!opts.hideAmounts;
    var t = opts.t || function (k) { return k; };
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext("2d");

    var grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#0b1120");
    grad.addColorStop(1, "#1b2a4a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Decorative accent circles.
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#7cf5c4";
    ctx.beginPath();
    ctx.arc(W - 80, 120, 220, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff8a65";
    ctx.beginPath();
    ctx.arc(60, H - 120, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.textBaseline = "alphabetic";

    // Title
    ctx.fillStyle = "#9fb4d9";
    ctx.font = "600 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(t("card.title").toUpperCase(), 72, 140);

    // Big yearly number
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 150px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    var bigNumber = hidden ? t("card.hiddenPlaceholder") : formatMoney(payload.totals.yearly, false, "");
    ctx.fillText(bigNumber, 70, 330);

    ctx.fillStyle = "#7cf5c4";
    ctx.font = "600 42px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(t("card.yearlyTotal"), 74, 390);

    // Subscription count pill
    roundRect(ctx, 70, 440, 520, 90, 45);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 40px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(String(payload.subscriptions.length) + " " + t("card.subscriptionCount"), 100, 497);

    // Top category
    var catCounts = {};
    payload.subscriptions.forEach(function (s) {
      catCounts[s.category] = (catCounts[s.category] || 0) + s.yearlyEquivalent;
    });
    var topCat = Object.keys(catCounts).sort(function (a, b) {
      return catCounts[b] - catCounts[a];
    })[0];
    if (topCat) {
      ctx.fillStyle = "#9fb4d9";
      ctx.font = "500 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(t("card.topCategory") + ": " + topCat.replace(/-/g, " "), 72, 580);
    }

    // Top 5 list
    var top5 = payload.subscriptions.slice(0, 5);
    var listY = 650;
    ctx.font = "600 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    top5.forEach(function (s, i) {
      var y = listY + i * 100;
      roundRect(ctx, 70, y, W - 140, 80, 18);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      var name = s.merchant.length > 22 ? s.merchant.slice(0, 22) + "…" : s.merchant;
      ctx.fillText((i + 1) + ".  " + name, 100, y + 50);
      ctx.textAlign = "right";
      ctx.fillStyle = "#7cf5c4";
      ctx.fillText(formatMoney(s.yearlyEquivalent, hidden, t("card.hiddenPlaceholder")), W - 100, y + 50);
      ctx.textAlign = "left";
    });

    // Footer
    ctx.fillStyle = "#6b7fa3";
    ctx.font = "400 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(t("card.generatedBy"), 72, H - 60);
  }

  global.SLF_CARD = { renderCard: renderCard, WIDTH: W, HEIGHT: H };
})(window);
