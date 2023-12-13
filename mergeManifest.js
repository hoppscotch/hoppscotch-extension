const { Reporter } = require("@parcel/plugin")
const fs = require("fs").promises

module.exports = new Reporter({
  async report({ event }) {
    const target = process.env.HOPP_EXTENSION_TARGET

    if (!target) {
      return
    }

    if (event.type == "buildSuccess") {
      const manifestCommon = (
        await fs.readFile("./manifest.common.json")
      ).toString()

      let targetManifestFilePath

      if (target == "CHROME") {
        targetManifestFilePath = "./manifest.chrome.json"
      } else if (target == "FIREFOX") {
        targetManifestFilePath = "./manifest.firefox.json"
      } else {
        return
      }

      const targetSpecificManifest = (
        await fs.readFile(targetManifestFilePath)
      ).toString()

      const manifestFinal = JSON.stringify(
        {
          ...JSON.parse(manifestCommon),
          ...JSON.parse(targetSpecificManifest),
        },
        null,
        2
      )

      // make sure the ./dist folder exists
      await fs.mkdir("./dist").catch(() => {})

      await fs.writeFile("./dist/manifest.json", manifestFinal, {
        flag: "w",
      })

      process.stdout.write("💚 Manifest File Written Successfully")
    }
  },
})
