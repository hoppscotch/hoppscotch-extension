import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

function errorToObject(e: any) {
  return {
    // Standard
    message: e.message,
    name: e.name,
    // Mozilla
    fileName: e.fileName,
    lineNumber: e.lineNumber,
    columnNumber: e.columnNumber,
    stack: e.stack,
    // Axios
    response: e.response
  };
}

const VERSION = { major: 0, minor: 3 };


interface PWChromeMessage<T> {
  messageType: "send-req" | "recv-req" | "send-version" | "recv-version"; 
  data: T;
}

interface RecvRequestMessageData {
  response: AxiosResponse<any> | null;
  error: any | null;
}

interface VersionRequestMessageData {
  version: { major: number, minor: number };
}


const handleSendRequestMessage = async (config: AxiosRequestConfig) => {
  try {
    const res = await axios(config);
    return <PWChromeMessage<RecvRequestMessageData>>{
      messageType: "recv-req",
      data: {
        response: {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
          data: res.data
        },
        error: null
      }
    };
  } catch (e) {
    return <PWChromeMessage<RecvRequestMessageData>> {
      messageType: "recv-req",
      data: {
        response: null,
        error: errorToObject(e)
      }
    };
  }
}

chrome.runtime.onMessage.addListener((message: PWChromeMessage<any>, _sender, sendResponse) => {
  if (message.messageType === "send-req") {
    handleSendRequestMessage(message.data).then(sendResponse);
  } else if (message.messageType === "send-version") {
    return <PWChromeMessage<VersionRequestMessageData>>{
      messageType: "recv-version",
      data: {
        version: VERSION
      }
    }
  }

  return true;
});
