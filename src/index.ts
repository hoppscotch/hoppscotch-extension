import axios, { AxiosRequestConfig } from "axios";

const VERSION = { major: 0, minor: 1 };


interface PWChromeMessage<T> {
  messageType: "send-req" | "recv-req" | "send-version" | "recv-version"; 
  data: T;
}

interface SendRequestMessageData {
  config: AxiosRequestConfig;
}

interface VersionRequestMessageData {
  version: { major: number, minor: number };
}


const handleSendRequestMessage = async (message: PWChromeMessage<SendRequestMessageData>) => {
  console.log("Request!!!");
  console.log(message);

  const res = await axios(message.data.config);
  return <PWChromeMessage<any>>{
    messageType: "recv-req",
    data: {
      response: res
    }
  };
}

chrome.runtime.onMessageExternal.addListener((message: PWChromeMessage<any>, _sender, sendResponse) => {
  console.log("Message!!!");
  console.log(message);
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
