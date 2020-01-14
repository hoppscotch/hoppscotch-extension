import axios, { AxiosRequestConfig } from "axios";

interface PWChromeMessage<T> {
  messageType: "send-req" | "recv-req"; 
  data: T;
}

interface SendRequestMessageData {
  config: AxiosRequestConfig;
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
  }

  return true;
});

console.log("Whaddup my glibbglobbss!!!!");
