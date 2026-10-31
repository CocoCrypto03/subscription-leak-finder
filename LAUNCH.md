# Launch checklist

Internal checklist (not part of the public repo narrative) to run through before and around a public launch. Check items off as you go.

## Suggested GitHub topics

`privacy` `finance` `personal-finance` `subscription-tracker` `csv-parser` `banking` `client-side` `static-site` `javascript` `no-backend`

## Suggested repo description

"Find the subscriptions you forgot. Drop a bank statement (CSV/OFX/QIF), everything is analyzed locally in your browser — nothing is uploaded."

## Before launch

- [ ] Demo GIF recorded and embedded at the top of the README (5-15s, shows the core value in one glance)
- [ ] README reviewed end to end: tagline, install-in-one-command actually works on a clean machine, badges resolve
- [ ] At least **5 `good first issue`** issues opened, each scoped small and clearly described (file/area to touch, expected outcome)
- [ ] CI green on `main`
- [ ] LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md present and not placeholder-only
- [ ] GitHub repo **topics** set (e.g. relevant language, category, use-case keywords — aim for 5-10)
- [ ] Repo description + homepage link filled in (GitHub repo settings)
- [ ] Social preview image set (GitHub repo settings > Social preview), if relevant
- [ ] `audit.sh` run on the repo, report clean (no secrets, no personal data)

## Launch day

- [ ] Show HN post drafted and submitted (title = what it does, not hype; link to repo, not landing page)
- [ ] Reddit post(s) drafted for 1-2 relevant subreddits, tailored tone per sub, not identical copy-paste
- [ ] X/Twitter thread posted (what it does, why, GIF/video, link)
- [ ] TikTok post if there's a visual demo angle worth it
- [ ] Links cross-posted where it makes sense, spaced out rather than all at once

## First 72 hours

- [ ] **Respond to every issue and PR within 24h**, even if just "thanks, looking into it"
- [ ] Watch star/traffic graphs (Insights tab) for where traffic is coming from
- [ ] Triage and label new issues promptly (`good first issue`, `bug`, `enhancement`)
- [ ] Thank first external contributors publicly (comment, or a mention in release notes)
- [ ] Fix anything embarrassing fast (broken install command, README typo) — these cost disproportionate trust

## Ongoing

- [ ] Keep a steady trickle of `good first issue` available, don't let it run dry
- [ ] Merge small good PRs fast; don't let first-time contributors wait
- [ ] Add a CHANGELOG or releases once there's enough to report
