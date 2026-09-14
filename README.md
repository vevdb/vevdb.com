# vevdb.com

The website for [VevDB](https://github.com/vevdb/vev), a small native embedded
database for current state, queryable history, and hypothetical transactions.

The site is plain HTML and CSS and is published with GitHub Pages. The
documentation is generated as static HTML from the Markdown files in the main
VevDB repository.

To preview the homepage locally, run a static file server in this directory:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Publishing

The Pages workflow builds and publishes the complete static site on every push
to `main`, when run manually, and every six hours so documentation changes in
[`vevdb/vev`](https://github.com/vevdb/vev) are picked up. The custom domain is
declared in `CNAME`; DNS is managed separately.

For a local documentation build, install the Node dependencies and pass the
path to a VevDB checkout:

```sh
npm install
npm run build:docs -- --source ../vev/docs --output _site --config docs.config.json
```

## Analytics and search discovery

The deployed site can enable privacy-conscious PostHog web analytics through
two GitHub Actions repository variables:

- `POSTHOG_PROJECT_KEY`: the public project token for a dedicated VevDB project
- `POSTHOG_API_HOST`: the matching ingestion host, normally
  `https://eu.i.posthog.com` for PostHog Cloud EU

The Pages workflow writes these values to `analytics-config.js` in the built
artifact. If either value is absent, analytics is a no-op in production. The
integration uses PostHog's always-cookieless mode, creates no person profiles,
masks autocaptured text and attributes, and disables session recording. The
PostHog project must also have **Cookieless server hash mode** enabled.

In addition to automatic pageviews, the site captures four intent events:

- `getting_started_clicked`
- `download_clicked`
- `capability_guide_clicked`, with a controlled `capability` value
- `evaluation_contact_clicked`, with `email` or `github_issue` as `method`

Every custom event also includes the current path and a controlled placement
label. Event properties never include link text, email addresses, or other
visitor-provided content.

For Google Search Console, add `https://vevdb.com` as a domain property, verify
it with the DNS TXT record Google provides, and submit
`https://vevdb.com/sitemap.xml`. The documentation build generates that sitemap
from `docs.config.json`, while `robots.txt` advertises it to crawlers.
