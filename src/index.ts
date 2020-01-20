import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

const VERSION = { major: 0, minor: 2 };


interface PWChromeMessage<T> {
  messageType: "send-req" | "recv-req" | "send-version" | "recv-version"; 
  data: T;
}

interface SendRequestMessageData {
  config: AxiosRequestConfig;
}

interface RecvRequestMessageData {
  response: AxiosResponse<any> | null;
  error: any | null;
}

interface VersionRequestMessageData {
  version: { major: number, minor: number };
}


const handleSendRequestMessage = async (message: PWChromeMessage<SendRequestMessageData>) => {
  try {
    const res = await axios(message.data.config);
    return <PWChromeMessage<RecvRequestMessageData>>{
      messageType: "recv-req",
      data: {
        response: res,
        error: null
      }
    };
  } catch (e) {
    return <PWChromeMessage<RecvRequestMessageData>> {
      messageType: "recv-req",
      data: {
        response: null,
        error: e
      }
    }
  }
}

chrome.runtime.onMessageExternal.addListener((message: PWChromeMessage<any>, _sender, sendResponse) => {
  if (message.messageType === "send-req") {
    handleSendRequestMessage(message).then(sendResponse);
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
