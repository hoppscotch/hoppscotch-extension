# Postwoman Extension for Google Chrome

<a href="https://chrome.google.com/webstore/detail/postwoman-extension-for-c/amknoiejhlmhancpahfcfcfhllgkpbld">![Get the add-on](https://developer.chrome.com/webstore/images/ChromeWebStore_Badge_v2_206x58.png)</a>

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
- Open Chrome and navigate to `chrome://extensions`, click on Load Unpacked and then select the generated dist folder.
- Copy the generated extension ID and paste it to the `EXTENSION_ID` property in the Postwoman repo's `functions/strategies/ChromeStrategy.js` file.

<br />
<br />
Postwoman is built with help of an amazing group of people.
<br />
Contribute to Postwoman: <a href="https://github.com/liyasthomas/postwoman">https://github.com/liyasthomas/postwoman</a>
<br/>

Sponsor Postwoman: [OpenCollective](https://opencollective.com/postwoman)


<br />
<br />
<p align="center"><b>made with ❤️ by <a href="https://github.com/AndrewBastin">andrew bastin</a></b></p>


