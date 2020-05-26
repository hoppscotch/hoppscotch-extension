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

const handleSendRequestMessage = async (config: any) => {
  try {
    const res = await axios({
      ...processRequestFormData(config),
      
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
