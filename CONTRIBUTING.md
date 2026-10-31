# Contributing to Subscription Leak Finder

First off, thank you for considering a contribution. This project is small and every bit of help — code, docs, bug reports, or ideas — genuinely moves it forward.

## Ground rules

- Be kind. See the [Code of Conduct](CODE_OF_CONDUCT.md).
- No contribution is too small. Typo fixes and doc improvements are welcome PRs.
- If you're unsure whether something is wanted, open an issue first and ask. We'd rather talk for two minutes than have you spend an evening on a PR we can't merge.

## Getting started

1. Fork the repo and clone your fork.
2. Create a branch: `git checkout -b my-fix`.
3. No dependencies to install — it's plain HTML/CSS/JS. Serve it locally to test in a browser:
   ```bash
   python3 -m http.server 8080   # then open http://localhost:8080
   ```
4. Make your change.
5. Run the test suite (Node, no dependencies):
   ```bash
   node tests/run-tests.mjs
   ```
6. Commit with a clear message and open a pull request.

## Adding a bank format

Add a file to `formats/` (copy an existing one as a starting point) with the
CSV header names your bank uses, the delimiter, decimal separator and date
format, then add its filename to `formats/index.json`. Add a row to
`samples/` and a check in `tests/run-tests.mjs` if you can — real (anonymized
or fictional) header rows are the most useful part of the PR.

## Adding a merchant

Add an entry to `data/merchants.json`: a normalized display name, a
`category` (used for duplicate detection — reuse an existing category when
it fits), the lowercase substrings your bank's description uses for that
merchant, and the merchant's **official** cancellation/management page if
one exists. One merchant = one PR.

## Good first issues

Look for the [`good first issue`](https://github.com/CocoCrypto03/subscription-leak-finder/labels/good%20first%20issue) label — these are scoped to be approachable without deep context on the codebase.

## Pull requests

- Keep PRs focused on one change. Smaller PRs get reviewed and merged faster.
- Describe *why*, not just *what*, in the PR description.
- Link the issue it closes, if any (`Closes #123`).
- It's fine to open a draft PR early to get feedback before it's finished.

## Reporting bugs / suggesting features

Please use the issue templates. Include:

- What you expected to happen
- What actually happened
- Steps to reproduce (for bugs)
- Your environment (OS, version, etc.) when relevant

## Response time

Maintainers aim to respond to new issues and PRs within 24 hours. If you haven't heard back after a few days, feel free to ping the issue.

Thanks again for contributing!
