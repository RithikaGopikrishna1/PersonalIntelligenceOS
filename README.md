# THE EDIT — a free personal intelligence magazine

A visual news dashboard with 11 categories, a front page, search, browser-only bookmarks, and a scheduled RSS refresh. **No AI, API keys, database, or paid hosting required.**

## Publish for £0 on GitHub Pages

1. Sign into [GitHub](https://github.com/) and create a **public** repository named `intelligence-dashboard` (do not initialise it with a README).
2. Download and unzip this project. **Upload all files and directories, including the `.github` hidden folder**, into the repository root using **Add file → Upload files**, then commit the changes. If your file manager hides `.github`, enable viewing hidden files first. Alternatively, use GitHub Desktop or git.
3. Go to repository **Settings → Pages → Build and deployment → Source → GitHub Actions**. This is important: select **GitHub Actions**, *not* Deploy from a branch.
4. Open the **Actions** tab and run **Refresh feeds and publish dashboard → Run workflow** if it has not run already. The first run fetches the RSS content and publishes the site.
5. Your dashboard will appear at `https://YOUR-USERNAME.github.io/intelligence-dashboard/` once deployment completes. Find the exact URL under Settings → Pages.

The scheduled workflow refreshes the news at approximately **06:17, 12:17, and 18:17 UTC** (GitHub schedules can be delayed). It also runs when you push code or select `Run workflow`.

### If GitHub Actions isn't visible or publishing fails

- Check that `.github/workflows/site.yml` was uploaded; this is a **hidden** folder on many computers.
- In **Settings → Pages**, choose **GitHub Actions** as Source.
- In **Actions**, open the last run to see its output and any feed errors.
- Some feeds occasionally fail or change URLs. The updater skips unavailable feeds and carries forward recent, previously indexed items when possible.

## What a no-AI summary means

The dashboard displays **short descriptions supplied by RSS publishers**, trimmed to a compact preview. These are not generated multi-source summaries and may be absent for some feeds. It deliberately does **not** scrape paywalled articles or reproduce full text. Every story links back to its publisher. Google News discovery items show a link rather than an excerpt.

Some items may not contain photos. Image-led cards use feed-provided thumbnails when available, and designed colour panels otherwise. Respect source licensing and terms. Content is only as current as each publisher's RSS feed and your most recent successful scheduled update.

## Customise your sources

Edit the `FEEDS` list in `scripts/update.py`. Every feed has a category ID, display source name, and RSS URL. Categories: `world`, `india`, `uk-us`, `business`, `ai-tech`, `startups`, `sports`, `science`, `culture`, `learning`, `women`.

To change visual categories or labels, edit `CATS` in `app.js`. Styling lives in `style.css`.

## Run locally

For an initial data update, run `python scripts/update.py` with Internet access. To view locally, run `python -m http.server 8000` inside the project folder and visit http://localhost:8000/. Double-clicking `index.html` may not load the JSON file due to browser security restrictions.

## Privacy and costs

This is a publicly accessible static site. Don't put private information in repository files. Bookmarks are saved in your browser's local storage, not synchronised. The site uses Google Fonts, but no analytics. GitHub Pages and ordinary public-repository Actions usage are free under GitHub's current terms, subject to limits and policies. GitHub may disable scheduled actions on inactive public repositories after 60 days; manually trigger the workflow or make a commit to reactivate if necessary.
