# vevdb.com

The website for [VevDB](https://github.com/vevdb/vev), a native, embedded
Datalog database built around immutable database values.

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
