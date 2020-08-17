# Hoppscotch Browser Extension

<a href="https://chrome.google.com/webstore/detail/hoppscotch-browser-extens/amknoiejhlmhancpahfcfcfhllgkpbld">![Get the add-on](https://developer.chrome.com/webstore/images/ChromeWebStore_Badge_v2_206x58.png)</a>
<a href="https://addons.mozilla.org/en-US/firefox/addon/hoppscotch/">![Get the add-on](https://addons.cdn.mozilla.net/static/img/addons-buttons/AMO-button_2.png)</a>

**Haven't tried Hoppscotch yet ? Try it at [https://hoppscotch.io/](https://hoppscotch.io/)**

<br />
This extension currently provides the following features to Hoppscotch.

- Overrides CORS restrictions for cross-origin requests.


### Building & Experimentation
- Setup a local copy of Hoppscotch repo [(Instructions)](https://github.com/hoppscotch/hoppscotch#developing-)
- Clone the repo
- Then head into the `manifest.json` file and edit it to match this snippet below

```
  "content_scripts": [
    {
      "matches": [
        "*://*/*",
        "https://hoppscotch.io/",
        "https://hoppscotch.io/*",
        "https://hoppscotch.netlify.com/*",
        "https://hoppscotch.netlify.com/"
      ],
      "js": [ "contentScript.js" ]
    }
  ],
```
- Run `npm install`
- Run `npm run build` to generate the *dist* folder
- Install the extension using your browser's install options (a quick google search will yield the methods)

<br />
<br />
Hoppscotch is built with the help of an amazing group of people.
<br />
Contribute to Hoppscotch: <a href="https://github.com/hoppscotch/hoppscotch">https://github.com/hoppscotch/hoppscotch</a>
<br/>

Sponsor Hoppscotch: [OpenCollective](https://opencollective.com/hoppscotch)


If you liked what you saw, please consider sponsoring, helps me keep the lights on!

<br />
<br />
<p align="center"><b>Happy Coding!!! ❤️</b></p>


