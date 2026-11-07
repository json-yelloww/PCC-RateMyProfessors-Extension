# Privacy Policy — PCC Rate My Professors Extension

**Last updated: November 6, 2026**

PCC Rate My Professors Extension is a free, unofficial browser extension that displays publicly available professor ratings alongside instructor names on [Pasadena City College's Class Search website](https://findclasses.pasadena.edu/).

This policy describes how version 1.0.0 of the extension handles information.

## Information the extension uses

When you visit PCC Class Search, the extension reads **publicly displayed instructor names** from class listings to look up the corresponding professor ratings. It does not require you to create an account or provide your name, email address, or other personal details.

To perform a lookup, the extension sends the **instructor's name** and a **Pasadena City College school identifier** over HTTPS to [Rate My Professors](https://www.ratemyprofessors.com/). The response can include a professor's name, rating, rating count, difficulty score, would-take-again percentage, department, and profile link. The extension uses that information to identify a suitable match and display a rating beside the instructor.

The extension does **not intentionally send your PCC class selections, enrollment records, login credentials, or browsing history** to Rate My Professors. However, as with ordinary internet requests, Rate My Professors may receive technical connection information such as your IP address and request headers. Rate My Professors handles information it receives under its own [Privacy Policy](https://www.ratemyprofessors.com/privacy).

## Local storage

The extension uses your browser's **local extension storage** (`chrome.storage.local`) to cache professor lookup results and reduce repeated requests. Cached entries may include the instructor name used for the lookup, matching professor details or lookup status, timestamps, and temporary error messages.

The extension checks cached results for freshness: successful matches are refreshed after approximately **7 days**, unmatched searches after **24 hours**, and failed lookups after **2 minutes**. Expiration does not necessarily delete an entry immediately; an older entry may remain on your device until it is replaced or the extension's local data is cleared.

This cache is stored on your device, not on a server operated by the extension developer. You can remove it by clearing the extension's stored site/app data where supported or uninstalling the extension and its data through your browser.

## Data sharing and third-party services

- **Rate My Professors:** Receives instructor-name search requests and the PCC school identifier so the extension can retrieve public professor ratings. As described above, its servers may also receive normal network connection information.
- **Extension developer:** The current extension does not send lookup activity or cached data to a developer-operated server.
- **Advertising and analytics:** The current extension does not include advertising trackers or analytics services, and the developer does not sell user data.

Clicking a professor rating opens the corresponding Rate My Professors webpage, where that site's own privacy practices apply.

## Permissions and website access

The extension requests:

- Access to `https://findclasses.pasadena.edu/*` to read displayed instructor names and add rating badges to class results.
- Access to `https://www.ratemyprofessors.com/*` to request professor-rating information.
- The browser's `storage` permission to keep a local cache.

It is not designed to inspect unrelated websites or collect your general browsing history.

## Your choices

You can disable or uninstall the extension at any time from your browser's extensions settings. Disabling the extension stops new lookups while it is disabled; uninstalling it and removing its stored data clears its local cache from your browser. If you prefer not to have instructor-name requests sent to Rate My Professors, disable or remove the extension before using PCC Class Search.

## Changes to this policy

If the extension's features or data-handling practices change, this policy will be updated. The latest policy will be available in the project's public GitHub repository.

## Contact

For questions about this extension or its privacy practices, open an issue at:

[GitHub Issues — PCC Rate My Professors Extension](https://github.com/json-yelloww/PCC-RateMyProfessors-Extension/issues)

Please do not post private personal information in a public GitHub issue.

## Disclaimer

This is an independent student project. It is **not affiliated with, sponsored by, or endorsed by Pasadena City College or Rate My Professors**.
