# Cirque Atlas

A responsive, embeddable map of Cirque du Soleil’s official show catalogue, hosted on GitHub Pages.

- Current runs and upcoming engagements, search by show/city/venue, country and offer filters.
- Linked map markers and show cards; overlapping shows are grouped by city.
- Published local-currency starting prices or ranges, official offer links, codes and conditions.
- Clear missing-price labels. Headline discount percentages are never converted into invented ticket amounts.
- Accessible show list, keyboard controls, mobile layout and an embed mode using the `embed=1` URL parameter.

## Data and freshness

The initial snapshot was collected on 18 November 2026 from the official catalogue, tour-plan API, ticket-offer API and structured booking-page metadata. It covers 18 productions and 68 engagements, including 14 current runs on that date. “Current” describes an engagement, not a performance every day.

The daily GitHub Actions workflow collects and validates the catalogue before deploying. Failed collection retains the previous snapshot and original timestamp. The page warns when the snapshot is over two days old. Manually researched supplementary venue prices have their own check and expiry dates and disappear when expired. They do not inherit the automatic refresh timestamp.

Ticket prices are dynamic and many primary feeds do not publish a numerical range. In those cases the map explicitly links to the seller’s calendar. Published ranges, starting prices, child/group offers and upgrades are kept distinct. The final selected date, seat, fees, tax and eligibility remain subject to checkout. This is not a seat-inventory or instant-quote service.

## Structure

`site/` is the complete static deployment. `scripts/collect-browser.js` reads public Cirque pages and APIs in a browser. `scripts/normalize.py` validates and generates the public snapshot atomically; raw research and tracking responses are excluded from Git. `scripts/supplements.json` stores time-limited venue price evidence. `tests/` checks venue integrity, run boundaries, filters, grouping, promotion handling and price-evidence expiry.

There are no API secrets, accounts, user tracking or paid map keys. Leaflet is vendored under its license. Standard OpenStreetMap tiles are fetched on demand; they are not bulk downloaded or cached for offline use. Show imagery loads from Cirque’s official media host; Google Fonts supplies the display typefaces. Show titles and imagery belong to Cirque du Soleil. This project is independent and unaffiliated.
