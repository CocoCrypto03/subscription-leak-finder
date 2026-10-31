# STATUT — subscription-leak-finder

## Ce qui marche

- **Pipeline complet testé de bout en bout** : drag & drop / file picker / bouton "Try with a sample statement" → parsing → normalisation marchand → détection → tableau + carte récap.
- **Parsers** (`js/parsers.js`) : CSV (délimiteur `,`/`;`/tab auto-détecté, décimal `,` ou `.` auto-détecté), OFX (avec et sans balises fermantes `</STMTTRN>`), QIF (dates ambiguës MM/DD vs DD/MM gérées), + heuristique générique quand aucun format bancaire ne matche l'en-tête.
- **9 formats bancaires** dans `formats/` : BNP Paribas, Société Générale, Crédit Agricole (colonnes Débit/Crédit séparées), Boursorama, Revolut, N26, Monzo, Chase, générique CSV.
- **42 marchands connus** dans `data/merchants.json` avec catégorie + lien de résiliation officiel ; les marchands inconnus reçoivent un nom deviné (catégorie "other") plutôt que d'être ignorés.
- **Détection** (`js/detect.js`) : paiements récurrents (hebdo/mensuel/trimestriel/annuel, tolérance sur l'écart de jours), hausses de prix au sein d'une même série, doublons de catégorie (ex. Netflix + Disney+), essai gratuit → payant (y compris ligne à 0,00 €).
- **Carte "Wrapped"** (`js/card.js`, canvas) avec case "masquer les montants" (remplace les sommes par `•••` dans l'image ET à l'écran) et téléchargement PNG.
- **FR/EN** (`js/i18n.js`), détection de la langue du navigateur, bascule manuelle, `<title>` traduit.
- **Confidentialité vérifiée, pas juste affirmée** : testé avec Playwright que 0 requête réseau n'a lieu entre le dépôt d'un fichier et l'affichage des résultats (19 requêtes au chargement de la page — toutes vers les propres assets statiques du site — puis 0 ensuite, fichier réel ou exemple).
- **25 tests automatisés** (`tests/run-tests.mjs`, Node pur via `vm`, sans dépendance) sur 6 relevés fictifs dont un format FR point-virgule/virgule décimale (`samples/sample-fr-bnp.csv`) : format matché, fréquence, hausse de prix, essai→payant, doublons, exclusion des achats ponctuels, dates ambiguës.
- 2 bugs réels trouvés et corrigés pendant les tests : une inversion DD/MM toujours identique dans le fallback de date ambiguë (parsing de date cassé), et une règle CSS `.modal{display:flex}` qui annulait l'attribut `hidden` et bloquait tous les clics de la page dès que la modale "Comment c'est vérifié ?" existait dans le DOM.
- GIFs/PNG de démo générés en Playwright headless dans `demo/` (16:9 pour le README, 9:16 pour TikTok, + 2 captures PNG).
- CI (`.github/workflows/ci.yml`) : lance `node tests/run-tests.mjs` + validation JSON de `data/` et `formats/`. Workflow de déploiement Pages (`.github/workflows/pages.yml`) présent (non testé en conditions réelles, pas de repo GitHub créé).

## Comment lancer

```bash
cd projets/subscription-leak-finder
python3 -m http.server 8080   # puis http://localhost:8080
node tests/run-tests.mjs       # suite de tests
```

## Ce qui reste

- Créer le repo GitHub (`gh repo create CocoCrypto03/subscription-leak-finder --public --source=. --push`) puis vérifier que le workflow Pages déploie correctement en conditions réelles (testé seulement en local).
- Ouvrir les 8 issues "good first issue" listées dans `ISSUES.md`.
- Limitation connue (issue #3) : deux transactions du même marchand le même jour calendaire cassent la détection de chaîne (écart de 0 jour ne matche aucun intervalle) — contournée dans les données de démo, pas corrigée dans le moteur.
- Mode clair absent (dark only) — issue #4.
- Devise unique supposée (€ codé en dur dans l'affichage) — issue #6.
- Dictionnaire de marchands volontairement modeste (42 entrées) : à enrichir par PR.
- Image social preview GitHub et topics à régler dans les paramètres du repo au moment de la publication (topics suggérés dans `LAUNCH.md`).

## Audit (`./audit.sh projets/subscription-leak-finder`)

Propre : aucun `.env`, aucun secret/token, aucun email, aucun chemin perso (`/Users/corentin`). Les 17 occurrences signalées sont toutes `CocoCrypto03` dans des liens GitHub/licence/README — attendu et correct (c'est l'identité publique du projet), pas une fuite.
