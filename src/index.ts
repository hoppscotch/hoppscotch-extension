import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { DEFAULT_ORIGIN_LIST } from "./defaultOrigins";


axios.interceptors.request.use(
  config => {
    (config as any).timeData = { startTime: new Date().getTime() };
    return config;
  }
  , 
  error => {
    return Promise.reject(error);
  }
)

axios.interceptors.response.use(
  response => {
    (response.config as any).timeData.endTime = new Date().getTime();
    return response;
  },
  error => {
    return Promise.reject(error);
  }
)

let cancelSource = axios.CancelToken.source();

function errorToObject(e: any) {
  if (e.response && e.response.data) {
    try {
      e.response.data = bufferToBase64(e.response.data);
    } catch (_e) {
    }
  }

  // This mess below is a hack to go around Firefox's memory bounding system 
  return {
    // Standard
    message: e.message ? JSON.parse(JSON.stringify(e.message)) : undefined,
    name: e.name ? JSON.parse(JSON.stringify(e.name)) : undefined,
    // Mozilla
    fileName: e.fileName ? JSON.parse(JSON.stringify(e.fileName)) : undefined,
    lineNumber: e.lineNumber ? JSON.parse(JSON.stringify(e.lineNumber)) : undefined,
    columnNumber: e.columnNumber ? JSON.parse(JSON.stringify(e.columnNumber)) : undefined,
    stack: e.stack ? JSON.parse(JSON.stringify(e.stack)) : undefined,
    // Axios
    response: e.response ? JSON.parse(JSON.stringify(e.response)) : undefined
  };
}

interface PWChromeMessage<T> {
  messageType: "send-req" | "recv-req" | "cancel-req"; 
  data: T;
}

interface RecvRequestMessageData {
  response: any;
  error: any | null;
  isBinary: boolean;
}

const convertDataURLToBlob = (dataurl: string) => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]); 
  let n = bstr.length; 
  const u8arr = new Uint8Array(n);

  while(n--){
    u8arr[n] = bstr.charCodeAt(n);
  }

  const blob = new Blob([u8arr], { type: mime });
  return blob;
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
        );
      }
      return acc;
    }, {} as { [property: string]: string });

// keep track of the cookies we have to delete after the request is made
let cookiesToDelete: { url?: string; cookies?: string[] } = {};
const removeRequestCookies: () => Promise<void> = async () => {
  if (!!cookiesToDelete.url && !!cookiesToDelete.cookies) {
    for (const name of cookiesToDelete.cookies) {
      await chrome.cookies.remove({
        url: cookiesToDelete.url,
        name,
      });
    }

    cookiesToDelete = {};
  }
};

const processRequestCookies: (reqConfig: any) => Promise<AxiosRequestConfig> =
  async (reqConfig) => {

    const cookie = Object.entries(reqConfig.headers || {}).find(
      ([header]) => header.toLowerCase() === "cookie"
    );

    if (!!cookie && !!reqConfig.url && typeof cookie[1] === "string") {
      cookiesToDelete = { url: reqConfig.url, cookies: [] };
      const parsedCookies = parseCookieString(cookie[1]);

      for (const [name, value] of Object.entries(parsedCookies)) {
        await chrome.cookies.set({
          url: reqConfig.url,
          name,
          value,
        });
        cookiesToDelete.cookies.push(name);
      }
    }

    return reqConfig;
  };

const processRequestFormData: (reqConfig: any) => AxiosRequestConfig = (reqConfig) => {
  if (reqConfig.formData || reqConfig.formFiles) {
    const form = new FormData();

    reqConfig.formFiles.forEach(({ key, value, filename }: { key: string, value: string, filename: string }) => {
      form.append(key, convertDataURLToBlob(value), filename);
    });

    reqConfig.formData.forEach(({ key, value }: { key: string, value: string }) => {
      form.append(key, value);
    });

    reqConfig.data = form;
    reqConfig.formFiles = null;
    reqConfig.formData = null;
  }

  return reqConfig as AxiosRequestConfig;
}

const processRequest: (reqConfig: any) => Promise<AxiosRequestConfig> = async (
  reqConfig
) => {
  await processRequestCookies(reqConfig);
  return processRequestFormData(reqConfig);
};

function bufferToBase64(buffer: any) {
  return btoa(new Uint8Array(buffer).reduce((data, byte)=> {
    return data + String.fromCharCode(byte);
  }, ''));
}

const handleSendRequestMessage = async (config: any) => {
  try {
    const processedConfig = await processRequest(config);

    if (config.wantsBinary) {
      const r = await axios({
        ...processedConfig,
        cancelToken: cancelSource.token,
        responseType: 'arraybuffer'
      });

      return <PWChromeMessage<RecvRequestMessageData>>{
        messageType: "recv-req",
        data: {
          response: {
            status: r.status,
            statusText: r.statusText,
            headers: r.headers,
            responseURL: r.request.responseURL,
            data: bufferToBase64(r.data),
            timeData: (r.config as any).timeData
          },
          isBinary: true,
          error: null
        }
      };
    } else {
      const res = await axios({
        ...processedConfig,
        
        cancelToken: cancelSource.token,

        transformResponse: [(data, headers) => {
          if (
            headers["content-type"] && (
              headers["content-type"].startsWith("application/json") ||
              headers["content-type"].startsWith("application/vnd.api+json") ||
              headers["content-type"].startsWith("application/hal+json")
            )
          ) {
            try {
              const jsonData = JSON.parse(data)
              return jsonData
            } catch (e) {
              return data
            }
          }

          return data
        }]
      });
      return <PWChromeMessage<RecvRequestMessageData>>{
        messageType: "recv-req",
        data: {
          response: {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
            responseURL: res.request.responseURL,
            data: res.data,
            timeData: (res.config as any).timeData
          },
          isBinary: false,
          error: null
        }
      };
    }
  } catch (e) {
    return <PWChromeMessage<RecvRequestMessageData>> {
      messageType: "recv-req",
      data: {
        response: null,
        error: errorToObject(e)
      }
    };
  } finally {
    // remove the cookies set for this request
    await removeRequestCookies();
  }
}

const cancelRequest = () => {
  cancelSource.cancel();
  cancelSource = axios.CancelToken.source();
}

chrome.runtime.onMessage.addListener((message: PWChromeMessage<any>, _sender, sendResponse) => {
  if (message.messageType === "send-req") {
    handleSendRequestMessage(message.data).then(sendResponse);
    return true;
  } else if (message.messageType === "cancel-req") {
    cancelRequest();
    return true;
  }
});


let originList: string[] = [];

chrome.storage.sync.get((items) => {
  originList = JSON.parse(items["originList"]);
});

chrome.storage.onChanged.addListener((changes, _areaName) => {
  if (changes.originList && changes.originList.newValue) {
    originList = JSON.parse(changes.originList.newValue);
  }
});

chrome.tabs.onUpdated.addListener((_id, _info, tab) => {
  if (tab.status !== "loading") {
    const url = new URL(tab.url);
    if (originList.includes(url.origin)) {
      chrome.tabs.sendMessage(tab.id, {
        action: '__POSTWOMAN_EXTENSION_PING__'
      }, (_response: boolean) => {
        if (chrome.runtime.lastError) {
          chrome.tabs.executeScript(tab.id, {
            file: "contentScript.js"
          });
        } else {
          console.log("Already hooked");
        }
      });

    }
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    originList: JSON.stringify(DEFAULT_ORIGIN_LIST)
  }, () => {});
});
