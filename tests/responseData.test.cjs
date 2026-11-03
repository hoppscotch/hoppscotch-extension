const assert = require("node:assert/strict")
const { readFileSync } = require("node:fs")
const { join } = require("node:path")
const { test } = require("node:test")
const { runInNewContext } = require("node:vm")
const ts = require("typescript")

const source = ts.transpileModule(
  readFileSync(join(__dirname, "../src/index.ts"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }
).outputText

function sendRequest(body, contentType, wantsBinary = false) {
  const listeners = []
  const event = { addListener() {} }
  const chrome = {
    runtime: {
      onMessage: { addListener: (listener) => listeners.push(listener) },
      onInstalled: event,
    },
    storage: {
      sync: { get: (callback) => callback({ originList: "[]" }) },
      onChanged: event,
    },
    tabs: { onUpdated: event },
  }
  runInNewContext(source, {
    exports: {},
    require: () => ({ DEFAULT_ORIGIN_LIST: [] }),
    chrome,
    AbortController,
    URL,
    btoa,
    fetch: async () => new Response(body, {
      headers: contentType ? { "content-type": contentType } : {},
    }),
  })
  return new Promise((resolve) => {
    listeners[0]({
      messageType: "send-req",
      data: { url: "https://example.test/", method: "GET", headers: {}, wantsBinary },
    }, { tab: { id: 1 } }, resolve)
  })
}

const cases = [
  ["JSON object", '{"ok":true}', "application/json", { ok: true }],
  ["JSON array", "[1,2]", "application/json; charset=utf-8", [1, 2]],
  ["JSON null", "null", "application/json", null],
  ["JSON false", "false", "application/json", false],
  ["JSON number", "0", "application/json", 0],
  ["JSON:API", '{"data":[]}', "application/vnd.api+json", { data: [] }],
  ["HAL JSON", '{"_links":{}}', "application/hal+json", { _links: {} }],
  ["plain text", "hello", "text/plain", "hello"],
  ["invalid JSON", "{invalid", "application/json", "{invalid"],
  ["empty body", "", "application/json", ""],
]

for (const [name, body, contentType, expected] of cases) {
  test(`returns ${name} in non-binary response data`, async () => {
    const message = await sendRequest(body, contentType)
    assert.equal(message.data.error, null)
    assert.equal(message.data.isBinary, false)
    // Browser messages serialize objects across execution contexts.
    assert.deepEqual(JSON.parse(JSON.stringify(message.data.response)).data, expected)
  })
}

test("binary responses continue returning base64", async () => {
  const message = await sendRequest("hello", "text/plain", true)
  assert.equal(message.data.error, null)
  assert.equal(message.data.isBinary, true)
  assert.equal(message.data.response.data, "aGVsbG8=")
})
