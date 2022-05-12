;(() => {
  const defineSubscribableObject = (obj) =>
    new Proxy(
      {
        ...obj,
        _subscribers: {},
        subscribe: function (prop, func) {
          if (Array.isArray(this._subscribers[prop])) {
            this._subscribers[prop].push(func)
          } else {
            this._subscribers[prop] = [func]
          }
        },
      },
      {
        set(obj, prop, newVal) {
          obj[prop] = newVal

          if (Array.isArray(obj._subscribers[prop])) {
            for (let subscriber of obj._subscribers[prop]) {
              subscriber(newVal)
            }
          }

          return true
        },
      }
    )

  if (window.__HOPP_EXTENSION_STATUS_PROXY__) {
    window.__HOPP_EXTENSION_STATUS_PROXY__.status = "unknown-origin"
  } else {
    window.__HOPP_EXTENSION_STATUS_PROXY__ = defineSubscribableObject({
      status: "unknown-origin",
    })
  }
})()
