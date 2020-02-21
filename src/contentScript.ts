window.addEventListener('message', ev => {
  if (ev.source !== window || !ev.data) {
    return;
  }

  if (ev.data.type === '__POSTWOMAN_EXTENSION_REQUEST__') {
    chrome.runtime.sendMessage({
      messageType: "send-req",
      data: ev.data.config
    }, (message) => {
      if (message.data.error) {
        window.postMessage({
          type: '__POSTWOMAN_EXTENSION_ERROR__',
          error: message.data.error
        }, '*');
      } else {
        window.postMessage({
          type: '__POSTWOMAN_EXTENSION_RESPONSE__',
          response: message.data.response
        }, '*');
      }
    })
  }
});

const VERSION = { major: 0, minor: 5 };

const script = document.createElement('script');
script.textContent = `
  window.__POSTWOMAN_EXTENSION_HOOK__ = {
    getVersion: () => (${JSON.stringify(VERSION)}),
    sendRequest: (config) => new Promise((resolve, reject) => {
      function handleMessage(ev) {
        if (ev.source !== window || !ev.data) {
          return;
        }

        if (ev.data.type === '__POSTWOMAN_EXTENSION_RESPONSE__') {
          resolve(ev.data.response);
          window.removeEventListener('message', handleMessage);
        } else if (ev.data.type === '__POSTWOMAN_EXTENSION_ERROR__') {
          const error = ev.data.error;

          // We're restoring the original Error object here
          const e = new Error(error.message, error.fileName, error.lineNumber);
          e.name = error.name;
          e.stack = error.stack;
          if (error.response) {
            e.response = error.response;
          }
          reject(e);
          window.removeEventListener('message', handleMessage);
        }
      }

      window.addEventListener('message', handleMessage);

      window.postMessage({
        type: '__POSTWOMAN_EXTENSION_REQUEST__',
        config
      }, '*');
    })
  }
`;

document.documentElement.appendChild(script);
script.parentNode.removeChild(script);
