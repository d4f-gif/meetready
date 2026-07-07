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
The form is one field: the swimmer's USA Swimming Member ID. It isn't a name search — USA
Swimming gates athlete name-search behind a logged-in account (`person-api …/Person/Search`
returns 403 anonymously), so a token-free, no-account static page can't search by name.

To get the ID, on the [USA Swimming Data Hub](https://data.usaswimming.org/) sign in (free),
use Search → Athletes, open the swimmer's page, and read the code in the browser's address
bar between `/athlete/` and `/best-times`, e.g. in
`data.usaswimming.org/search/athlete/9688AB9C4AFF4B/best-times` the Member ID is
`9688AB9C4AFF4B`. Paste that into MeetReady. After lookup the app shows the swimmer's name
and club straight from the API so you can confirm it's the right swimmer.

## Files
- `index.html`, `style.css` — the page and the swimmer input form.
- `lookup.js` — live USA Swimming API lookup (Member ID → best times per event/course).
- `app.js` — pure logic (PDF grid parsing, eligibility, value ranking). Copied from `swimmeet`.
- `ui.js` — collects inputs, runs the lookup, runs `pdf.js`, paints results.
- `standards.js` — the USA Swimming 2024-2028 National Age Group Motivational Standards,
  gendered (`M`/`F`), all age groups, SCY and LCM, keyed `gender|ageGroup|course|event` in
  hundredths. Parsed from USA Swimming's official 2024-2028 PDF and spot-checked against the
  known boys values (matched except one pre-existing typo the PDF corrects). Powers the
  "Next / Need" column and the open-meet lineup picker.
- `vendor/pdf.min.js`, `vendor/pdf.worker.min.js` — pdf.js, vendored so nothing loads from
  the internet.

Gender isn't returned by the API, so `lookup.js` infers it: it scores each swim against both
the boys' and girls' tables and picks whichever reproduces the official levels the API
returns (boys' cuts are uniformly faster, so the match is decisive). The detected side shows
in the confirmation line ("Boys standards" / "Girls standards").

## Publishing to GitHub Pages
Push this folder to a repo and enable Pages (Settings → Pages → deploy from the folder /
branch). Privacy note: on a personal account a Pages site is public to anyone with the URL
even if the source repo is private. The data shown is already public record on USA Swimming.

## Standards refresh
`standards.js` holds the 2024-2028 cycle. When USA Swimming publishes the next cycle,
re-parse its official motivational-standards PDF with `pdftotext -layout` (girls cuts left
B→AAAA, event code middle, boys cuts right AAAA→B) and regenerate `standards.js`.
