# Postwoman Browser Extension

<a href="https://chrome.google.com/webstore/detail/postwoman-extension-for-c/amknoiejhlmhancpahfcfcfhllgkpbld">![Get the add-on](https://developer.chrome.com/webstore/images/ChromeWebStore_Badge_v2_206x58.png)</a>
<a href="https://addons.mozilla.org/en-US/firefox/addon/postwoman/">![Get the add-on](https://addons.cdn.mozilla.net/static/img/addons-buttons/AMO-button_2.png)</a>

**Haven't tried Postwoman yet ? Try it at [https://postwoman.io/](https://postwoman.io/)**

<br />
This extension currently provides the following features to Postwoman.

- Overrides CORS restrictions for cross-origin requests.


### Building & Experimentation
- Setup a local copy of postwoman repo [(Instructions)](https://github.com/liyasthomas/postwoman#developing-)
- Clone the repo
- Then head into the `manifest.json` file and edit it to match this snippet below

```
  "content_scripts": [
    {
      "matches": [
        "*://*/*",
        "https://postwoman.io/",
        "https://postwoman.io/*",
        "https://postwoman.netlify.com/*",
        "https://postwoman.netlify.com/"
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
Postwoman is built with the help of an amazing group of people.
<br />
Contribute to Postwoman: <a href="https://github.com/postwoman-io/postwoman">https://github.com/postwoman-io/postwoman</a>
<br/>

Sponsor Postwoman: [OpenCollective](https://opencollective.com/postwoman)


If you liked what you saw, please consider sponsoring, helps me keep the lights on!

<br />
<br />
<p align="center"><b>Happy Coding!!! ❤️</b></p>


