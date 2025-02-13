# Hoppscotch Browser Extension

| Chrome | Firefox |
|---|---|
| <a href="https://chrome.google.com/webstore/detail/hoppscotch-browser-extens/amknoiejhlmhancpahfcfcfhllgkpbld"><picture><source media="(prefers-color-scheme: dark)" srcset="https://gist.githubusercontent.com/liyasthomas/f65059863bfd701559aebe3257ec9cc8/raw/54d5c1457fd54f15f968b39bdf2aba1c4f8b452b/chrome-badge-dark.svg"><source media="(prefers-color-scheme: light)" srcset="https://gist.githubusercontent.com/liyasthomas/f65059863bfd701559aebe3257ec9cc8/raw/54d5c1457fd54f15f968b39bdf2aba1c4f8b452b/chrome-badge-light.svg"><img alt="Firefox" src="https://gist.githubusercontent.com/liyasthomas/f65059863bfd701559aebe3257ec9cc8/raw/54d5c1457fd54f15f968b39bdf2aba1c4f8b452b/chrome-badge-light.svg"></picture></a> | <a href="https://addons.mozilla.org/en-US/firefox/addon/hoppscotch/"><picture><source media="(prefers-color-scheme: dark)" srcset="https://gist.githubusercontent.com/liyasthomas/f65059863bfd701559aebe3257ec9cc8/raw/54d5c1457fd54f15f968b39bdf2aba1c4f8b452b/firefox-badge-dark.svg"><source media="(prefers-color-scheme: light)" srcset="https://gist.githubusercontent.com/liyasthomas/f65059863bfd701559aebe3257ec9cc8/raw/54d5c1457fd54f15f968b39bdf2aba1c4f8b452b/firefox-badge-light.svg"><img alt="Firefox" src="https://gist.githubusercontent.com/liyasthomas/f65059863bfd701559aebe3257ec9cc8/raw/54d5c1457fd54f15f968b39bdf2aba1c4f8b452b/firefox-badge-light.svg"></picture></a> |

[Hoppscotch](https://github.com/hoppscotch/hoppscotch) is a community-driven end-to-end open-source API development ecosystem.

**Haven't tried Hoppscotch yet? Try it at [hoppscotch.io](https://hoppscotch.io)**

This extension provides the following features to Hoppscotch:

- [x] Overrides `CORS` restrictions for cross-origin requests (it allows requests against localhost).

> [!IMPORTANT]
> If you want to use the extension anywhere outside [the official Hoppscotch instance](https://hoppscotch.io) you may want to add the domain to the extension's origin list. You can access the origin list by clicking on the extension icon on your browser toolbar.

### Development

1. Install or verify the installation of [pnpm](https://pnpm.io)
2. Clone the repository
3. Open the root folder in a [Git Bash](https://www.geeksforgeeks.org/working-on-git-bash/) command-line
4. Run `pnpm install` to install the necessary packages
5. Generate the **dist** folder for the target browser
    1. For Chrome, run `pnpm run build:chrome`
    2. For Firefox, run `pnpm run build:firefox`
4. Package and install the extension to the target browser
    1. For Chrome, follow this [tutorial](https://developer.chrome.com/docs/extensions/get-started/)
    2. For Firefox, follow this [tutorial](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension)

Hoppscotch is built with the help of an amazing group of people.

Contribute to Hoppscotch: <a href="https://github.com/hoppscotch/hoppscotch">https://github.com/hoppscotch/hoppscotch</a>

Sponsor Hoppscotch: [OpenCollective](https://opencollective.com/hoppscotch), [Github Sponsors](https://github.com/sponsors/hoppscotch)

If you liked what you saw, please consider sponsoring, helps me keep the lights on!

**Happy Coding!!! ❤️**
