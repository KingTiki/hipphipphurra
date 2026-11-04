# Third-party notices

The project code, documentation and project illustrations are covered by the
[MIT license](LICENSE). The font files below are separate works and remain
under the **SIL Open Font License 1.1 (OFL-1.1)**. The MIT license does not
replace their license or copyright notices.

## Bricolage Grotesque

- File: `public/fonts/bricolage-grotesque-latin.woff2`
- Copyright: 2022 The Bricolage Grotesque Project Authors
- Upstream project: <https://github.com/ateliertriay/bricolage>
- Distribution: Google Fonts, Latin webfont, weights 600–700; downloaded unchanged.
- Source: <https://fonts.gstatic.com/s/bricolagegrotesque/v9/3y9H6as8bTXq_nANBjzKo3IeZx8z6up5BeSl5jBNz_19PpbpMXuECpwUxJBOm_OJWiawA1Xp.woff2>
- Full license and copyright notice: [bricolage-grotesque-OFL.txt](public/fonts/bricolage-grotesque-OFL.txt)
- SHA-256: `a97804dc9fbe5fc972a08018c5eda4dab7ef2346f64c57e61419d05e6de4ea1c`

## DM Sans

- File: `public/fonts/dm-sans-latin.woff2`
- Copyright: 2014 The DM Sans Project Authors
- Upstream project: <https://github.com/googlefonts/dm-fonts>
- Distribution: Google Fonts, Latin webfont, weights 400–600; downloaded unchanged.
- Source: <https://fonts.gstatic.com/s/dmsans/v17/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K4.woff2>
- Full license and copyright notice: [dm-sans-OFL.txt](public/fonts/dm-sans-OFL.txt)
- SHA-256: `9fea608a947e67020c33cad9a6fe3d60c54119dfb8cff87768a8117a15ed7543`

Keep the two font license files with any redistribution of the fonts,
including Docker images. See the [official OFL FAQ](https://openfontlicense.org/ofl-faq/)
for the license's distribution and modification rules.

## Project illustrations

`public/cake.svg` was created for this project; `public/favicon.svg` is a cropped
version of that illustration. `public/bunting.svg` and `public/confetti.svg`
were transferred from the project-specific design mockup. The line icons in
`public/index.html` are project SVG markup. These files are distributed under
the project MIT license.

The local `designs/` exports, including their React preview runtime, are excluded
from Git and the Docker build context. The application does not use or
redistribute that runtime.

## Runtime and container base

There are no npm dependencies. Node.js and SQLite are supplied by the runtime,
not vendored into this repository. Docker uses the official
[`node:24-bookworm-slim` image](https://github.com/nodejs/docker-node), whose
Node.js, Debian and other components retain their respective upstream licenses.
The project license and this notices file are included in the application image.
