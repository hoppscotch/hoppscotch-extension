const fs = require("fs")

const hookContent = fs.readFileSync(__dirname + "/hookContent.js", {
  encoding: "utf-8",
})

const hookContentInvalidOrigin = fs.readFileSync(
  __dirname + "/hookContentInvalidOrigin.js",
  {
    encoding: "utf-8",
  }
)

export type HOOK_MESSAGE = {
  type: "execute_hook"
  origin_type: "VALID_ORIGIN" | "UNKNOWN_ORIGIN"
}

function getOriginList(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get((items) => {
      let originList: string[] = JSON.parse(items["originList"])

      resolve(originList)
    })
  })
}

/**
 * when an origin is added or removed,reevaluate the hook
 */
chrome.storage.onChanged.addListener((changes, _areaName) => {
  if (changes.originList && changes.originList.newValue) {
    injectHoppExtensionHook()
  }
})

async function injectHoppExtensionHook() {
  let originList = await getOriginList()

  let url = new URL(window.location.href)

  const originType = originList.includes(url.origin)
    ? "VALID_ORIGIN"
    : "UNKNOWN_ORIGIN"

  if (process.env.HOPP_EXTENSION_TARGET === "FIREFOX") {
    const script = document.createElement("script")
    script.textContent = originList.includes(url.origin)
      ? hookContent
      : hookContentInvalidOrigin
    document.documentElement.appendChild(script)
    script.parentNode.removeChild(script)
  } else {
    chrome.runtime.sendMessage(<HOOK_MESSAGE>{
      type: "execute_hook",
      origin_type: originType,
    })
  }
}

window.addEventListener("message", (ev) => {
  if (ev.source !== window || !ev.data) {
    return
  }

  if (ev.data.type === "__POSTWOMAN_EXTENSION_REQUEST__") {
    chrome.runtime.sendMessage(
      {
        messageType: "send-req",
        data: ev.data.config,
      },
      (message) => {
        if (message.data.error) {
          window.postMessage(
            {
              type: "__POSTWOMAN_EXTENSION_ERROR__",
              error: message.data.error,
            },
            "*"
          )
        } else {
          window.postMessage(
            {
              type: "__POSTWOMAN_EXTENSION_RESPONSE__",
              response: message.data.response,
              isBinary: message.data.isBinary,
            },
            "*"
          )
        }
      }
    )
  } else if (ev.data.type === "__POSTWOMAN_EXTENSION_CANCEL__") {
    chrome.runtime.sendMessage({
      messageType: "cancel-req",
    })
  }
})

const VERSION = { major: 0, minor: 27 }

injectHoppExtensionHook()

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "__POSTWOMAN_EXTENSION_PING__") {
    sendResponse(true)
  }
})
