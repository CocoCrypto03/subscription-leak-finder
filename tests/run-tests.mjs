// run-tests.mjs — loads the browser-global JS files (js/parsers.js,
// js/merchants.js, js/detect.js) into a sandboxed context with Node's `vm`
// module (no bundler, no test framework dependency) and runs them against
// the fictional sample statements in samples/. Run with: node tests/run-tests.mjs
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadApp() {
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.console = console;
  const context = vm.createContext(sandbox);
  ["js/parsers.js", "js/merchants.js", "js/detect.js"].forEach((f) => {
    const code = fs.readFileSync(path.join(ROOT, f), "utf8");
    vm.runInContext(code, context, { filename: f });
  });
  return sandbox;
}

function loadFormats(app) {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, "formats/index.json"), "utf8"));
  return index.files.map((f) => JSON.parse(fs.readFileSync(path.join(ROOT, "formats", f), "utf8")));
}

function loadMerchants(app) {
  const json = JSON.parse(fs.readFileSync(path.join(ROOT, "data/merchants.json"), "utf8"));
  return app.SLF_MERCHANTS.buildIndex(json);
}

function analyze(app, formatDefs, merchantsIndex, filename) {
  const text = fs.readFileSync(path.join(ROOT, "samples", filename), "utf8");
  const parsed = app.SLF_PARSERS.parseStatement(filename, text, formatDefs);
  const enriched = parsed.transactions.map((tx) => {
    const m = app.SLF_MERCHANTS.matchMerchant(tx.description, merchantsIndex);
    return { date: tx.date, amount: tx.amount, description: tx.description, merchant: m.normalized, category: m.category, cancelUrl: m.cancelUrl, known: m.known };
  });
  const result = app.SLF_DETECT.detectSubscriptions(enriched);
  result.formatUsed = parsed.formatUsed;
  result.transactionCount = enriched.length;
  return result;
}

let passed = 0;
let failed = 0;

function check(label, condition, detail) {
  if (condition) {
    passed++;
    console.log("  PASS  " + label);
  } else {
    failed++;
    console.log("  FAIL  " + label + (detail ? "  (" + detail + ")" : ""));
  }
}

function subByMerchant(result, name) {
  return result.subscriptions.find((s) => s.merchant === name);
}

const app = loadApp();
const formatDefs = loadFormats(app);
const merchantsIndex = loadMerchants(app);

console.log("== sample-fr-bnp.csv (FR, ';' delimiter, ',' decimal) ==");
{
  const r = analyze(app, formatDefs, merchantsIndex, "sample-fr-bnp.csv");
  check("format matched as BNP Paribas", r.formatUsed === "BNP Paribas (FR)", r.formatUsed);
  check("2 subscriptions detected (Netflix, Spotify)", r.subscriptions.length === 2, r.subscriptions.length);
  const netflix = subByMerchant(r, "Netflix");
  check("Netflix detected monthly", !!netflix && netflix.frequency === "monthly");
  check("Netflix price hike detected (13.49 -> 15.49)", !!netflix && netflix.priceHikes.length === 1, JSON.stringify(netflix && netflix.priceHikes));
  const spotify = subByMerchant(r, "Spotify");
  check("Spotify detected, no price hike", !!spotify && spotify.priceHikes.length === 0);
  check("non-recurring purchases (Carrefour, SNCF) excluded", r.subscriptions.every((s) => s.merchant !== "Carrefour Market Paris" && s.merchant !== "Sncf Connect"));
}

console.log("== sample-us-chase.csv (US, ',' delimiter, '.' decimal, MM/DD/YYYY) ==");
{
  const r = analyze(app, formatDefs, merchantsIndex, "sample-us-chase.csv");
  check("format matched as Chase", r.formatUsed === "Chase (US)", r.formatUsed);
  const netflix = subByMerchant(r, "Netflix");
  const disney = subByMerchant(r, "Disney+");
  check("Netflix + Disney+ both detected", !!netflix && !!disney);
  check("Netflix + Disney+ flagged as duplicates (same category)", !!netflix && !!disney && netflix.isDuplicate && disney.isDuplicate);
  const fitapp = r.subscriptions.find((s) => s.merchant.toLowerCase().indexOf("fitapp") !== -1 || s.merchant.toLowerCase().indexOf("inc") !== -1);
  check("FitApp trial-then-paid detected", !!fitapp && !!fitapp.trial, fitapp && JSON.stringify(fitapp.trial));
  check("one-off Amazon/Uber purchases excluded", r.subscriptions.every((s) => s.merchant.toLowerCase().indexOf("amazon") === -1 && s.merchant.toLowerCase().indexOf("uber") === -1));
}

console.log("== sample-revolut.csv (Revolut export) ==");
{
  const r = analyze(app, formatDefs, merchantsIndex, "sample-revolut.csv");
  check("format matched as Revolut", r.formatUsed === "Revolut", r.formatUsed);
  const nordvpn = subByMerchant(r, "NordVPN");
  check("NordVPN detected annual", !!nordvpn && nordvpn.frequency === "annual", nordvpn && nordvpn.frequency);
  check("NordVPN price hike detected (59.99 -> 69.99)", !!nordvpn && nordvpn.priceHikes.length === 1);
  const deezer = subByMerchant(r, "Deezer");
  check("Deezer detected monthly", !!deezer && deezer.frequency === "monthly");
}

console.log("== sample-generic-unknown-bank.csv (no known bank format) ==");
{
  const r = analyze(app, formatDefs, merchantsIndex, "sample-generic-unknown-bank.csv");
  check("falls back to generic CSV detection", r.formatUsed === "Generic CSV (auto-detected)", r.formatUsed);
  check("1 recurring subscription detected", r.subscriptions.length === 1, r.subscriptions.length);
  check("coffee shop one-off excluded", r.subscriptions.every((s) => s.merchant.toLowerCase().indexOf("coffee") === -1));
}

console.log("== sample-statement.ofx (OFX, no closing tags) ==");
{
  const r = analyze(app, formatDefs, merchantsIndex, "sample-statement.ofx");
  check("format used is OFX", r.formatUsed === "OFX");
  check("3 transactions parsed into 1 subscription", r.transactionCount === 3 && r.subscriptions.length === 1, r.transactionCount + "/" + r.subscriptions.length);
  const netflix = subByMerchant(r, "Netflix");
  check("Netflix recognized from OFX NAME field", !!netflix);
}

console.log("== sample-statement.qif (QIF, ambiguous MM/DD dates) ==");
{
  const r = analyze(app, formatDefs, merchantsIndex, "sample-statement.qif");
  check("format used is QIF", r.formatUsed === "QIF");
  check("3 transactions parsed into 1 subscription", r.transactionCount === 3 && r.subscriptions.length === 1, r.transactionCount + "/" + r.subscriptions.length);
  const netflix = subByMerchant(r, "Netflix");
  check("Netflix recognized from QIF P field", !!netflix);
  check("ambiguous QIF date parsed as MM/DD (15th Jan, not 15th month)", !!netflix && netflix.firstDate.getUTCMonth() === 0, netflix && netflix.firstDate.toISOString());
}console.log("== quarterly billing detection heuristics ==");
{
  const driftedQuarterly = [
    { date: new Date(Date.UTC(2026, 0, 1)), amount: -45.00, description: "CLOUD BACKUP PRO", merchant: "Cloud Backup Pro", category: "cloud-storage", cancelUrl: null, known: true },
    { date: new Date(Date.UTC(2026, 3, 11)), amount: -45.00, description: "CLOUD BACKUP PRO", merchant: "Cloud Backup Pro", category: "cloud-storage", cancelUrl: null, known: true }
  ];
  const r1 = app.SLF_DETECT.detectSubscriptions(driftedQuarterly);
  check("quarterly charge with 100-day gap and matching amount detected", r1.subscriptions.length === 1 && r1.subscriptions[0].frequency === "quarterly", JSON.stringify(r1.subscriptions));

  const uncorroboratedGap = [
    { date: new Date(Date.UTC(2026, 0, 1)), amount: -37.42, description: "LOCAL HARDWARE", merchant: "Local Hardware", category: "uncategorized", cancelUrl: null, known: false },
    { date: new Date(Date.UTC(2026, 3, 11)), amount: -61.18, description: "LOCAL HARDWARE", merchant: "Local Hardware", category: "uncategorized", cancelUrl: null, known: false }
  ];
  const r2 = app.SLF_DETECT.detectSubscriptions(uncorroboratedGap);
  check("uncorroborated 100-day gap with varying odd amounts excluded", r2.subscriptions.length === 0, r2.subscriptions.length);
}


console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed > 0 ? 1 : 0);
