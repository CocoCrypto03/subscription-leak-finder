<div align="center">

# Subscription Leak Finder

**Drop your bank statement. Find the subscriptions you forgot. Nothing leaves your browser.**

![demo](demo/demo-16x9.gif)

[![CI](https://github.com/CocoCrypto03/subscription-leak-finder/actions/workflows/ci.yml/badge.svg)](https://github.com/CocoCrypto03/subscription-leak-finder/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/CocoCrypto03/subscription-leak-finder?style=social)](https://github.com/CocoCrypto03/subscription-leak-finder/stargazers)
[![Contributors](https://img.shields.io/github/contributors/CocoCrypto03/subscription-leak-finder)](https://github.com/CocoCrypto03/subscription-leak-finder/graphs/contributors)
[![Good first issues](https://img.shields.io/github/issues/CocoCrypto03/subscription-leak-finder/good%20first%20issue)](https://github.com/CocoCrypto03/subscription-leak-finder/labels/good%20first%20issue)

**[Try it live →](https://cococrypto03.github.io/subscription-leak-finder/)**

</div>

## Install in one command

No install needed — it's a static page. Open the [live demo](https://cococrypto03.github.io/subscription-leak-finder/), or run it locally:

```bash
git clone https://github.com/CocoCrypto03/subscription-leak-finder.git && cd subscription-leak-finder && python3 -m http.server 8080
```

## Why Subscription Leak Finder

- **100% local.** Your bank statement never leaves your browser — no backend, no upload, no account. Verifiable: open your browser's Network tab, drop a file, and watch nothing happen.
- **Finds what you'd miss by eye.** Normalizes messy bank descriptions ("CB *NETFLIX.COM 1234"), clusters recurring charges by interval and amount, and flags price hikes, duplicate subscriptions (two music streaming services?), and free trials that quietly turned into paid plans.
- **Works with your bank's export as-is.** BNP Paribas, Société Générale, Crédit Agricole, Boursorama, Revolut, N26, Monzo, Chase, OFX, QIF, or any generic CSV — column detection figures out the rest.

## Quick start

```bash
python3 -m http.server 8080   # from the repo root
# open http://localhost:8080
```

Then drag a CSV/OFX/QIF bank export onto the page, or click **Try with a sample statement** to see it work on fictional data first.

## Usage

1. Export a statement from your bank (CSV, OFX or QIF — usually under "Download transactions" / "Télécharger mes opérations").
2. Drop the file on the page.
3. Review the list of recurring charges, sorted by yearly cost, with price-hike / duplicate / trial-to-paid flags and direct cancellation links where known.
4. Optionally generate a shareable "Wrapped" recap image — check **Hide amounts** first if you're posting it publicly.

## How privacy is enforced

This is a static site with no backend and no analytics. After the page (HTML/CSS/JS + the small merchant/format dictionaries) finishes loading, it makes **zero** further network requests — the file you drop is read with the browser's local File API and processed entirely in memory. Verify it yourself: open DevTools → Network, drop a statement, and watch nothing new appear. The same check runs in this repo's automated demo capture (`demo/`).

## Project layout

- `index.html`, `css/`, `js/` — the app itself (plain JS, no build step, no framework).
- `formats/` — one JSON file per bank export format (column names, delimiter, decimal separator, date format). **Adding/fixing a bank format is one small PR** — see [`CONTRIBUTING.md`](CONTRIBUTING.md).
- `data/merchants.json` — known-merchant dictionary (normalized name, category, official cancellation link). **Adding a merchant is one small PR.**
- `samples/` — fictional bank statements used by the automated tests.
- `tests/run-tests.mjs` — `node tests/run-tests.mjs` runs the detection logic against the sample statements.

## Contributing

Contributions are very welcome, big or small. Check [`CONTRIBUTING.md`](CONTRIBUTING.md) for setup, and the [`good first issue`](https://github.com/CocoCrypto03/subscription-leak-finder/labels/good%20first%20issue) label if you don't know where to start. Opening an issue to discuss an idea before a big PR is always appreciated, but not required for small fixes.

All contributors are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=CocoCrypto03/subscription-leak-finder&type=Date)](https://star-history.com/#CocoCrypto03/subscription-leak-finder&Date)

## License

[MIT](LICENSE) &copy; CocoCrypto03

---

<!-- French version below. Keep the English version above as the primary, international entry point. -->

<details>
<summary><strong>Lire en français</strong></summary>

## Subscription Leak Finder (FR)

**Dépose ton relevé bancaire. Retrouve les abonnements oubliés. Rien ne quitte ton navigateur.**

L'interface est aussi disponible en français directement dans l'application (bouton de langue en haut à droite).

### Installation en une commande

Aucune installation nécessaire — c'est une page statique. Ouvre la [démo en ligne](https://cococrypto03.github.io/subscription-leak-finder/), ou lance-la en local :

```bash
git clone https://github.com/CocoCrypto03/subscription-leak-finder.git && cd subscription-leak-finder && python3 -m http.server 8080
```

### Pourquoi Subscription Leak Finder

- **100 % local.** Ton relevé bancaire ne quitte jamais ton navigateur — pas de serveur, pas d'envoi, pas de compte. Vérifiable toi-même : onglet Réseau ouvert, dépose un fichier, rien ne se passe.
- **Trouve ce que l'œil rate.** Normalise les libellés bancaires confus, regroupe les paiements récurrents par intervalle et montant, et signale les hausses de prix, les doublons (deux abonnements de streaming musical ?) et les essais gratuits devenus payants.
- **Compatible avec l'export de ta banque tel quel.** BNP Paribas, Société Générale, Crédit Agricole, Boursorama, Revolut, N26, Monzo, Chase, OFX, QIF, ou tout CSV générique.

### Contribuer

Les contributions sont les bienvenues, petites ou grandes. Voir [`CONTRIBUTING.md`](CONTRIBUTING.md) et les issues [`good first issue`](https://github.com/CocoCrypto03/subscription-leak-finder/labels/good%20first%20issue). Ajouter un format bancaire (`formats/`) ou un marchand (`data/merchants.json`) est pensé pour tenir en une petite PR.

</details>
