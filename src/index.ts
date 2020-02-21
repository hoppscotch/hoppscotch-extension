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

interface PWChromeMessage<T> {
  messageType: "send-req" | "recv-req"; 
  data: T;
}

interface RecvRequestMessageData {
  response: AxiosResponse<any> | null;
  error: any | null;
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
    return true;
  }
});
