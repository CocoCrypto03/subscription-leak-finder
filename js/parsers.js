// parsers.js — turns raw CSV/OFX/QIF text into a flat list of transactions.
// { date: Date, amount: number (negative = money out), description: string }
// Pure functions, no DOM, no network. This is the part most bank-format PRs touch.
(function (global) {
  "use strict";

  // ---------- CSV splitting (quote-aware) ----------

  function splitCsvLine(line, delimiter) {
    var out = [];
    var cur = "";
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map(function (s) {
      return s.trim();
    });
  }

  function splitLines(text) {
    return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(function (l) {
      return l.trim().length > 0;
    });
  }

  function detectDelimiter(lines) {
    var candidates = [",", ";", "\t"];
    var sample = lines.slice(0, Math.min(10, lines.length));
    var best = ",";
    var bestScore = -1;
    candidates.forEach(function (d) {
      var counts = sample.map(function (l) {
        return splitCsvLine(l, d).length;
      });
      if (counts.length === 0) return;
      var first = counts[0];
      if (first < 2) return; // needs at least 2 columns to be plausible
      var consistent = counts.filter(function (c) {
        return c === first;
      }).length;
      var score = consistent * first; // reward both consistency and column count
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    });
    return best;
  }

  // ---------- Amount parsing ----------

  function parseAmount(raw, decimalSeparator) {
    if (raw == null) return NaN;
    var s = String(raw).trim();
    if (s === "") return NaN;
    // Strip currency symbols and spaces (incl. non-breaking space used as thousands sep).
    s = s.replace(/[€$£\s]/g, "");
    var neg = false;
    if (/^\(.*\)$/.test(s)) {
      neg = true;
      s = s.slice(1, -1);
    }
    if (decimalSeparator === ",") {
      // European style: '.' or ' ' as thousands, ',' as decimal.
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // US/UK style: ',' as thousands, '.' as decimal.
      s = s.replace(/,/g, "");
    }
    var n = parseFloat(s);
    if (isNaN(n)) return NaN;
    return neg ? -n : n;
  }

  function guessDecimalSeparator(values) {
    var commaDecimal = 0;
    var dotDecimal = 0;
    values.forEach(function (v) {
      if (/^-?\d+,\d{1,2}$/.test(v)) commaDecimal++;
      if (/^-?\d+\.\d{1,2}$/.test(v)) dotDecimal++;
    });
    return commaDecimal >= dotDecimal ? "," : ".";
  }

  // ---------- Date parsing ----------

  function parseDate(raw, format) {
    if (!raw) return null;
    var s = String(raw).trim();
    var m;
    if (format === "YYYY-MM-DD" || /^\d{4}-\d{2}-\d{2}/.test(s)) {
      m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    }
    if (format === "MM/DD/YYYY") {
      m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m) return new Date(Date.UTC(+m[3], +m[1] - 1, +m[2]));
    }
    if (format === "DD/MM/YYYY") {
      m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
    }
    // Generic fallbacks, tried in order.
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      // Ambiguous (no explicit format given): if one side can't be a valid
      // month, it must be the day. Otherwise default to DD/MM (most bank
      // exports this app targets are EU-first).
      var a = +m[1], b = +m[2];
      if (b > 12 && a <= 12) return new Date(Date.UTC(+m[3], a - 1, b)); // MM/DD
      return new Date(Date.UTC(+m[3], b - 1, a)); // DD/MM (default, or a>12 forces it)
    }
    m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
    m = s.match(/^(\d{8})$/); // OFX/QIF compact YYYYMMDD
    if (m) {
      var str = m[1];
      return new Date(Date.UTC(+str.slice(0, 4), +str.slice(4, 6) - 1, +str.slice(6, 8)));
    }
    var d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function looksLikeDate(s) {
    return parseDate(s) !== null;
  }

  // ---------- Bank format matching ----------

  function normalizeHeader(h) {
    return String(h || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // strip accents
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function findColumn(headerRow, aliases) {
    var normalizedHeader = headerRow.map(normalizeHeader);
    for (var i = 0; i < aliases.length; i++) {
      var target = normalizeHeader(aliases[i]);
      var idx = normalizedHeader.indexOf(target);
      if (idx !== -1) return idx;
    }
    return -1;
  }

  function tryMatchFormat(headerRow, fmt) {
    if (fmt.heuristic) return null; // generic-csv is handled separately
    var dateIdx = findColumn(headerRow, fmt.headerAliases.date || []);
    var descIdx = findColumn(headerRow, fmt.headerAliases.description || []);
    if (dateIdx === -1 || descIdx === -1) return null;
    if (fmt.headerAliases.amount) {
      var amtIdx = findColumn(headerRow, fmt.headerAliases.amount);
      if (amtIdx === -1) return null;
      return { fmt: fmt, dateIdx: dateIdx, descIdx: descIdx, amountIdx: amtIdx };
    }
    if (fmt.headerAliases.debit && fmt.headerAliases.credit) {
      var debitIdx = findColumn(headerRow, fmt.headerAliases.debit);
      var creditIdx = findColumn(headerRow, fmt.headerAliases.credit);
      if (debitIdx === -1 && creditIdx === -1) return null;
      return { fmt: fmt, dateIdx: dateIdx, descIdx: descIdx, debitIdx: debitIdx, creditIdx: creditIdx };
    }
    return null;
  }

  function detectGenericCsv(rows, headerRow) {
    var body = rows.slice(1);
    if (body.length === 0) return null;
    var colCount = headerRow.length;
    var dateIdx = -1, bestDateScore = -1;
    var numericCols = [];
    for (var c = 0; c < colCount; c++) {
      var colVals = body.map(function (r) {
        return r[c];
      });
      var dateScore = colVals.filter(looksLikeDate).length;
      if (dateScore > bestDateScore) {
        bestDateScore = dateScore;
        dateIdx = c;
      }
      var numericScore = colVals.filter(function (v) {
        return /^-?\(?[\d.,\s€$£]+\)?$/.test(String(v || "").trim()) && String(v || "").trim() !== "";
      }).length;
      numericCols.push({ idx: c, score: numericScore });
    }
    if (dateIdx === -1 || bestDateScore === 0) return null;
    numericCols = numericCols.filter(function (nc) {
      return nc.idx !== dateIdx && nc.score > body.length * 0.5;
    });
    numericCols.sort(function (a, b) {
      return b.score - a.score;
    });
    if (numericCols.length === 0) return null;
    var amountIdx = numericCols[0].idx;
    var descIdx = -1, bestLen = -1;
    for (var c2 = 0; c2 < colCount; c2++) {
      if (c2 === dateIdx || c2 === amountIdx) continue;
      var avgLen =
        body.reduce(function (sum, r) {
          return sum + String(r[c2] || "").length;
        }, 0) / body.length;
      if (avgLen > bestLen) {
        bestLen = avgLen;
        descIdx = c2;
      }
    }
    if (descIdx === -1) descIdx = amountIdx === 0 ? dateIdx : 0;
    var decimalSeparator = guessDecimalSeparator(
      body.map(function (r) {
        return r[amountIdx];
      })
    );
    return { dateIdx: dateIdx, descIdx: descIdx, amountIdx: amountIdx, decimalSeparator: decimalSeparator };
  }

  // ---------- Public: parse any CSV text against known formats ----------

  function parseCsvText(text, formatDefs) {
    var lines = splitLines(text);
    if (lines.length < 2) throw new Error("empty");
    var delimiter = detectDelimiter(lines);
    var rows = lines.map(function (l) {
      return splitCsvLine(l, delimiter);
    });
    var headerRow = rows[0];
    var body = rows.slice(1);

    var matched = null;
    for (var i = 0; i < formatDefs.length; i++) {
      var m = tryMatchFormat(headerRow, formatDefs[i]);
      if (m) {
        matched = m;
        break;
      }
    }

    var transactions = [];

    if (matched) {
      var fmt = matched.fmt;
      body.forEach(function (row) {
        var dateStr = row[matched.dateIdx];
        var desc = row[matched.descIdx];
        var date = parseDate(dateStr, fmt.dateFormat);
        if (!date) return;
        var amount;
        if (matched.amountIdx != null) {
          amount = parseAmount(row[matched.amountIdx], fmt.decimalSeparator);
        } else {
          var debit = matched.debitIdx !== -1 ? parseAmount(row[matched.debitIdx], fmt.decimalSeparator) : NaN;
          var credit = matched.creditIdx !== -1 ? parseAmount(row[matched.creditIdx], fmt.decimalSeparator) : NaN;
          var d = isNaN(debit) ? 0 : Math.abs(debit);
          var cr = isNaN(credit) ? 0 : Math.abs(credit);
          amount = cr - d;
        }
        if (isNaN(amount) || !desc) return;
        transactions.push({ date: date, amount: amount, description: desc });
      });
      return { transactions: transactions, formatUsed: fmt.label };
    }

    // Fallback: generic heuristic detection.
    var generic = detectGenericCsv(rows, headerRow);
    if (!generic) throw new Error("unrecognized");
    body.forEach(function (row) {
      var date = parseDate(row[generic.dateIdx]);
      if (!date) return;
      var amount = parseAmount(row[generic.amountIdx], generic.decimalSeparator);
      var desc = row[generic.descIdx];
      if (isNaN(amount) || !desc) return;
      transactions.push({ date: date, amount: amount, description: desc });
    });
    return { transactions: transactions, formatUsed: "Generic CSV (auto-detected)" };
  }

  // ---------- OFX ----------

  function parseOfxText(text) {
    var transactions = [];
    var blocks = text.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi) || [];
    if (blocks.length === 0) {
      // Some OFX exports omit closing tags (SGML style); fall back to splitting.
      blocks = text.split(/<STMTTRN>/i).slice(1).map(function (b) {
        return b.split(/<\/BANKTRANLIST>|<\/STMTTRN>/i)[0];
      });
    }
    blocks.forEach(function (block) {
      var amtMatch = block.match(/<TRNAMT>([^<\r\n]+)/i);
      var dateMatch = block.match(/<DTPOSTED>([^<\r\n]+)/i);
      var nameMatch = block.match(/<NAME>([^<\r\n]+)/i) || block.match(/<PAYEE>([^<\r\n]+)/i);
      var memoMatch = block.match(/<MEMO>([^<\r\n]+)/i);
      if (!amtMatch || !dateMatch) return;
      var date = parseDate(dateMatch[1].trim().slice(0, 8));
      var amount = parseAmount(amtMatch[1], ".");
      var description = (nameMatch ? nameMatch[1] : memoMatch ? memoMatch[1] : "").trim();
      if (!description && memoMatch) description = memoMatch[1].trim();
      if (!date || isNaN(amount)) return;
      transactions.push({ date: date, amount: amount, description: description || "Unknown" });
    });
    return { transactions: transactions, formatUsed: "OFX" };
  }

  // ---------- QIF ----------

  function parseQifText(text) {
    var transactions = [];
    var lines = splitLines(text);
    var cur = { date: null, amount: null, payee: "" };
    function flush() {
      if (cur.date && cur.amount != null) {
        transactions.push({ date: cur.date, amount: cur.amount, description: cur.payee || "Unknown" });
      }
      cur = { date: null, amount: null, payee: "" };
    }
    lines.forEach(function (line) {
      var code = line.charAt(0);
      var value = line.slice(1).trim();
      if (line.trim() === "^") {
        flush();
        return;
      }
      if (code === "D") cur.date = parseDate(value) || parseDate(value.replace(/'/g, "/"));
      else if (code === "T" || code === "U") cur.amount = parseAmount(value, ".");
      else if (code === "P") cur.payee = value;
      else if (code === "M" && !cur.payee) cur.payee = value;
    });
    flush();
    return { transactions: transactions, formatUsed: "QIF" };
  }

  // ---------- Dispatch ----------

  function parseStatement(filename, text, formatDefs) {
    var lower = (filename || "").toLowerCase();
    var trimmed = text.trim();
    if (lower.endsWith(".ofx") || /<OFX>/i.test(trimmed.slice(0, 500))) {
      return parseOfxText(text);
    }
    if (lower.endsWith(".qif") || /^!Type:/im.test(trimmed.slice(0, 200))) {
      return parseQifText(text);
    }
    return parseCsvText(text, formatDefs);
  }

  global.SLF_PARSERS = {
    parseStatement: parseStatement,
    parseCsvText: parseCsvText,
    parseOfxText: parseOfxText,
    parseQifText: parseQifText,
    parseAmount: parseAmount,
    parseDate: parseDate,
    splitCsvLine: splitCsvLine,
    detectDelimiter: detectDelimiter
  };
})(window);
