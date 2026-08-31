# vevdb.com

The website for [VevDB](https://github.com/vevdb/vev), a native, embedded
Datalog database built around immutable database values.

The site is plain HTML and CSS and is published with GitHub Pages. To preview it
locally, run a static file server in this directory, for example:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Publishing

Changes pushed to `main` are published from the repository root. The custom
domain is declared in `CNAME`; DNS is managed separately.
