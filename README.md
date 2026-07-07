# MeetReady — swim meet qualifier (web app)

Live at **https://d4f-gif.github.io/meetready/** (a standalone project site, unlinked and
noindexed).

A generic sibling of the private `swimmeet` app. Instead of being hardwired to two swimmers,
MeetReady takes **any** swimmer's details as input on the page — name, club, state/ZIP, and
their **USA Swimming Member ID** — pulls their best times live, and (when you drop a meet
PDF) tells you what they qualify for and which events to sign up for, with the meet event
number on each.

Everything runs in your browser. There is **no server, no account, no AI, no tokens**:

- The swimmer's times come straight from the **USA Swimming official Times API**
  (`times-api.usaswimming.org`), which sends `Access-Control-Allow-Origin: *`, so the page
  can call it directly. Each event's **level (B/BB/A/…)** is the official one USA Swimming
  assigns that swim.
- The meet PDF is parsed locally with `pdf.js` (vendored in `vendor/`, nothing loads from
  the internet).
- The eligibility and value-ranking logic is `app.js`, copied verbatim from `swimmeet`.

## How to find a Member ID
Step 1 is ID entry, not a name search: USA Swimming gates athlete name-search behind a
logged-in account (`person-api …/Person/Search` returns 403 anonymously), so a token-free,
no-account static page can't search by name. Instead the page links to USA Swimming's own
[individual search](https://data.usaswimming.org/datahub/usas/individualsearch) — search the
name there (girls and boys), open the profile, and copy the Member ID from the page URL.
Name, club and state on the MeetReady form are optional and only confirm you matched the
right swimmer (the app shows the club/LSC the API returns next to what you typed).

## Files
- `index.html`, `style.css` — the page and the swimmer input form.
- `lookup.js` — live USA Swimming API lookup (Member ID → best times per event/course).
- `app.js` — pure logic (PDF grid parsing, eligibility, value ranking). Copied from `swimmeet`.
- `ui.js` — collects inputs, runs the lookup, runs `pdf.js`, paints results.
- `standards.js` — national motivational-standards table for the "seconds to next cut"
  column. Currently empty (`{}`); levels still come from the API. Fill later to enable
  gap-to-next math and open-meet lineup ranking.
- `vendor/pdf.min.js`, `vendor/pdf.worker.min.js` — pdf.js, vendored so nothing loads from
  the internet.

## Publishing to GitHub Pages
Push this folder to a repo and enable Pages (Settings → Pages → deploy from the folder /
branch). Privacy note: on a personal account a Pages site is public to anyone with the URL
even if the source repo is private. The data shown is already public record on USA Swimming.

## Not yet done
`standards.js` is empty, so the dashboard's "Next / Need" columns and the open-meet lineup
picker are limited. Qualifying meets (cuts printed in the PDF) work fully. Add the national
boys+girls motivational-standards table to complete it.
