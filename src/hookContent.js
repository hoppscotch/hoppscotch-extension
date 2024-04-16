;(() => {
  const defineSubscribableObject = (obj) =>
    new Proxy(
      {
        ...obj,
        _subscribers: {},
        subscribe: function (prop, func) {
          if (Array.isArray(this._subscribers[prop])) {
            this._subscribers[prop].push(func)
          } else {
            this._subscribers[prop] = [func]
          }
        },
      },
      {
        set(obj, prop, newVal) {
          obj[prop] = newVal

          if (Array.isArray(obj._subscribers[prop])) {
            for (let subscriber of obj._subscribers[prop]) {
              subscriber(newVal)
            }
          }

          return true
        },
      }
    )

  if (window.__HOPP_EXTENSION_STATUS_PROXY__) {
    window.__HOPP_EXTENSION_STATUS_PROXY__.status = "available"
  } else {
    window.__HOPP_EXTENSION_STATUS_PROXY__ = defineSubscribableObject({
      status: "available",
    })
  }

  window.__POSTWOMAN_EXTENSION_HOOK__ = {
    getVersion: () => ({ major: 0, minor: 34 }),

    decodeB64ToArrayBuffer: (input, ab) => {
      const keyStr =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="

      const bytes = parseInt((input.length / 4) * 3, 10)

      let uarray
      let chr1, chr2, chr3
      let enc1, enc2, enc3, enc4
      let i = 0
      let j = 0

      if (ab) uarray = new Uint8Array(ab)
      else uarray = new Uint8Array(bytes)

      input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "")

      for (i = 0; i < bytes; i += 3) {
        //get the 3 octects in 4 ascii chars
        enc1 = keyStr.indexOf(input.charAt(j++))
        enc2 = keyStr.indexOf(input.charAt(j++))
        enc3 = keyStr.indexOf(input.charAt(j++))
        enc4 = keyStr.indexOf(input.charAt(j++))

        chr1 = (enc1 << 2) | (enc2 >> 4)
        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2)
        chr3 = ((enc3 & 3) << 6) | enc4

        uarray[i] = chr1
        if (enc3 != 64) uarray[i + 1] = chr2
        if (enc4 != 64) uarray[i + 2] = chr3
      }

      return uarray
    },

    transformFormData: async (config) => {
      const toBase64 = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.readAsDataURL(file)
          reader.onload = () => resolve(reader.result)
          reader.onerror = (error) => reject(error)
        })

      if (config.data instanceof FormData) {
        config.formFiles = []
        config.formData = []

        const entries = Array.from(config.data.entries())

        for (const [key, value] of entries) {
          if (value instanceof File) {
            const convertedValue = await toBase64(value)

            config.formFiles.push({
              key: key,
              value: convertedValue,
              filename: value.name,
            })
          } else {
            config.formData.push({
              key: key,
              value: value,
            })
          }
        }

        config.data = null

        return config
      }
    },

    cancelRequest: (config) => {
      window.postMessage(
        {
          type: "__POSTWOMAN_EXTENSION_CANCEL__",
        },
        "*"
      )
    },

    sendRequest: (config) =>
      new Promise((resolve, reject) => {
        function handleMessage(ev) {
          if (ev.source !== window || !ev.data) {
            return
          }

          if (ev.data.type === "__POSTWOMAN_EXTENSION_RESPONSE__") {
            // Apply transformation from base64 to arraybuffer
            if (ev.data.isBinary) {
              const bytes = (ev.data.response.data.length / 4) * 3
              const ab = new ArrayBuffer(bytes)
              window.__POSTWOMAN_EXTENSION_HOOK__.decodeB64ToArrayBuffer(
                ev.data.response.data,
                ab
              )

              ev.data.response.data = ab
            }

            resolve(ev.data.response)
            window.removeEventListener("message", handleMessage)
          } else if (ev.data.type === "__POSTWOMAN_EXTENSION_ERROR__") {
            const error = ev.data.error

            // We're restoring the original Error object here
            const e = new Error(error.message, error.fileName, error.lineNumber)
            e.name = error.name
            e.stack = error.stack
            if (error.response) {
              e.response = error.response

              const bytes = (e.response.data.length / 4) * 3
              const ab = new ArrayBuffer(bytes)

              window.__POSTWOMAN_EXTENSION_HOOK__.decodeB64ToArrayBuffer(
                e.response.data,
                ab
              )
              e.response.data = ab
            }
            reject(e)
            window.removeEventListener("message", handleMessage)
          }
        }

        window.addEventListener("message", handleMessage)

        window.__POSTWOMAN_EXTENSION_HOOK__
          .transformFormData(config)
          .then((transformedConfig) => {
            window.postMessage(
              {
                type: "__POSTWOMAN_EXTENSION_REQUEST__",
                config,
              },
              "*"
            )
          })
      }),
  }
})()
