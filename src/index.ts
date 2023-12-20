import { AxiosRequestConfig, AxiosRequestHeaders } from "axios"
import { DEFAULT_ORIGIN_LIST } from "./defaultOrigins"

type HoppExtensionRequestMeta = {
  timeData?: {
    startTime?: number
    endTime?: number
  }
}

let abortController = new AbortController()

const convertAxiosHeadersIntoFetchHeaders = (headers: AxiosRequestHeaders) =>
  Object.entries(headers).reduce((fetchHeaders, [key, value]): HeadersInit => {
    // setting content-type when using fetch will break the upload unless we provide a proper boundary.
    // but we omit that header and browser will set the correct boundary itself.
    return key == "content-type" && headers[key] == "multipart/form-data"
      ? { ...fetchHeaders }
      : {
          ...fetchHeaders,
          [key]: value.toString(),
        }
  }, <HeadersInit>{})

async function fetchUsingAxiosConfig(
  axiosConfig: AxiosRequestConfig<any>
): Promise<[Response, HoppExtensionRequestMeta]> {
  const fetchHeaders = convertAxiosHeadersIntoFetchHeaders(axiosConfig.headers)

  const requestMeta: HoppExtensionRequestMeta = { timeData: {} }
  requestMeta.timeData.startTime = new Date().getTime()

  // TODO: check different examples with axios body
  const res = await fetch(axiosConfig.url, {
    headers: {
      ...fetchHeaders,
    },
    method: axiosConfig.method,

    // Ignore the body for GET and HEAD requests to prevent error with axios
    body: (["get", "head"].includes(axiosConfig.method?.toLowerCase())) ? undefined : axiosConfig.data,
    signal: abortController.signal,
  })

  requestMeta.timeData.endTime = new Date().getTime()

  return [res, requestMeta]
}

function errorToObject(e: any) {
  if (e.response && e.response.data) {
    try {
      e.response.data = bufferToBase64(e.response.data)
    } catch (_e) {}
  }

  // This mess below is a hack to go around Firefox's memory bounding system
  return {
    // Standard
    message: e.message ? JSON.parse(JSON.stringify(e.message)) : undefined,
    name: e.name ? JSON.parse(JSON.stringify(e.name)) : undefined,
    // Mozilla
    fileName: e.fileName ? JSON.parse(JSON.stringify(e.fileName)) : undefined,
    lineNumber: e.lineNumber
      ? JSON.parse(JSON.stringify(e.lineNumber))
      : undefined,
    columnNumber: e.columnNumber
      ? JSON.parse(JSON.stringify(e.columnNumber))
      : undefined,
    stack: e.stack ? JSON.parse(JSON.stringify(e.stack)) : undefined,
    // Axios
    response: e.response ? JSON.parse(JSON.stringify(e.response)) : undefined,
  }
}

interface PWChromeMessage<T> {
  messageType: "send-req" | "recv-req" | "cancel-req"
  data: T
}

interface RecvRequestMessageData {
  response: any
  error: any | null
  isBinary: boolean
}

const convertDataURLToBlob = (dataurl: string) => {
  const arr = dataurl.split(",")
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  const blob = new Blob([u8arr], { type: mime })
  return blob
}

const parseCookieString: (str: string) => { [property: string]: string } = (
  str
) =>
  str
    .split(";")
    .map((value) => value.split("="))
    .reduce((acc, curr) => {
      if (!!curr[0] && !!curr[1]) {
        acc[decodeURIComponent(curr[0].trim())] = decodeURIComponent(
          curr[1].trim()
        )
      }
      return acc
    }, {} as { [property: string]: string })

// keep track of the cookies we have to delete after the request is made
let cookiesToDelete: { url?: string; cookies?: string[] } = {}
const removeRequestCookies: () => Promise<void> = async () => {
  if (!!cookiesToDelete.url && !!cookiesToDelete.cookies) {
    for (const name of cookiesToDelete.cookies) {
      await chrome.cookies.remove({
        url: cookiesToDelete.url,
        name,
      })
    }

    cookiesToDelete = {}
  }
}

const processRequestCookies: (
  reqConfig: any
) => Promise<AxiosRequestConfig> = async (reqConfig) => {
  const cookie = Object.entries(reqConfig.headers || {}).find(
    ([header]) => header.toLowerCase() === "cookie"
  )

  if (!!cookie && !!reqConfig.url && typeof cookie[1] === "string") {
    cookiesToDelete = { url: reqConfig.url, cookies: [] }
    const parsedCookies = parseCookieString(cookie[1])

    for (const [name, value] of Object.entries(parsedCookies)) {
      await chrome.cookies.set({
        url: reqConfig.url,
        name,
        value,
      })
      cookiesToDelete.cookies.push(name)
    }
  }

  return reqConfig
}

const processRequestFormData: (reqConfig: any) => AxiosRequestConfig = (
  reqConfig
) => {
  if (reqConfig.formData || reqConfig.formFiles) {
    const form = new FormData()

    reqConfig.formFiles.forEach(
      ({
        key,
        value,
        filename,
      }: {
        key: string
        value: string
        filename: string
      }) => {
        form.append(key, convertDataURLToBlob(value), filename)
      }
    )

    reqConfig.formData.forEach(
      ({ key, value }: { key: string; value: string }) => {
        form.append(key, value)
      }
    )

    reqConfig.data = form
    reqConfig.formFiles = null
    reqConfig.formData = null
  }

  return reqConfig as AxiosRequestConfig
}

const processRequest: (reqConfig: any) => Promise<AxiosRequestConfig> = async (
  reqConfig
) => {
  await processRequestCookies(reqConfig)
  return processRequestFormData(reqConfig)
}

function bufferToBase64(buffer: any) {
  return btoa(
    new Uint8Array(buffer).reduce((data, byte) => {
      return data + String.fromCharCode(byte)
    }, "")
  )
}

const processDataBasedOnContentType = async (
  data: string,
  contentTypeHeader: string
) => {
  if (
    contentTypeHeader &&
    (contentTypeHeader.startsWith("application/json") ||
      contentTypeHeader.startsWith("application/vnd.api+json") ||
      contentTypeHeader.startsWith("application/hal+json"))
  ) {
    try {
      data = JSON.parse(data)
    } catch (e) {}
  }
}

const getAllFetchResponseHeaders = (
  fetchHeaders: Headers
): Record<string, string> => {
  const headers: Record<string, string> = {}

  fetchHeaders.forEach((value, key) => {
    headers[key] = value
  })

  return headers
}

const handleSendRequestMessage = async (config: any) => {
  try {
    const processedConfig = await processRequest(config)

    if (config.wantsBinary) {
      const [r, requestMeta] = await fetchUsingAxiosConfig({
        ...processedConfig,
        responseType: "arraybuffer",
        validateStatus: () => true,
      })

      let headers = getAllFetchResponseHeaders(r.headers)

      return <PWChromeMessage<RecvRequestMessageData>>{
        messageType: "recv-req",
        data: {
          response: {
            status: r.status,
            statusText: r.statusText,
            headers,
            responseURL: r.url,
            data: bufferToBase64(await r.arrayBuffer()),
            timeData: requestMeta.timeData,
          },
          isBinary: true,
          error: null,
        },
      }
    } else {
      const [res, requestMeta] = await fetchUsingAxiosConfig({
        ...processedConfig,
      })

      const resText = await res.text()
      const contentTypeHeader = res.headers.get("content-type")

      const data = await processDataBasedOnContentType(
        resText,
        contentTypeHeader
      )

      let headers = getAllFetchResponseHeaders(res.headers)

      return <PWChromeMessage<RecvRequestMessageData>>{
        messageType: "recv-req",
        data: {
          response: {
            status: res.status,
            statusText: res.statusText,
            headers,
            responseURL: res.url,
            data: data,
            timeData: requestMeta.timeData,
          },
          isBinary: false,
          error: null,
        },
      }
    }
  } catch (e) {
    return <PWChromeMessage<RecvRequestMessageData>>{
      messageType: "recv-req",
      data: {
        response: null,
        error: errorToObject(e),
      },
    }
  } finally {
    // remove the cookies set for this request
    await removeRequestCookies()
  }
}

const cancelRequest = () => {
  abortController.abort()

  // reset the abort controller for the next request
  abortController = new AbortController()
}

chrome.runtime.onMessage.addListener(
  (message: PWChromeMessage<any>, _sender, sendResponse) => {
    if (message.messageType === "send-req") {
      handleSendRequestMessage(message.data).then(sendResponse)
      return true
    } else if (message.messageType === "cancel-req") {
      cancelRequest()
      return true
    }
  }
)

let originList: string[] = []

chrome.storage.sync.get((items) => {
  originList = JSON.parse(items["originList"])
})

chrome.storage.onChanged.addListener((changes, _areaName) => {
  if (changes.originList && changes.originList.newValue) {
    originList = JSON.parse(changes.originList.newValue)
  }
})

chrome.tabs.onUpdated.addListener((_id, _info, tab) => {
  if (tab.status !== "loading") {
    chrome.tabs.sendMessage(
      tab.id,
      {
        action: "__POSTWOMAN_EXTENSION_PING__",
      },
      (_response: boolean) => {
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["contentScript.js"],
          })
        } else {
          console.log("Already hooked")
        }
      }
    )
  }
})

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set(
    {
      originList: JSON.stringify(DEFAULT_ORIGIN_LIST),
    },
    () => {}
  )
})

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type && message.type == "execute_hook" && sender.tab.id) {
    const files =
      message.origin_type == "VALID_ORIGIN"
        ? ["hookContent.js"]
        : ["hookContentInvalidOrigin.js"]

    chrome.scripting.executeScript({
      target: {
        tabId: sender.tab.id,
      },
      files,
      world: "MAIN",
    })
  }
})
