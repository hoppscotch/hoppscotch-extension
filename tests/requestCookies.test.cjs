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

async function sendCookieHeader(cookie) {
  const listeners = []
  const written = []
  const event = { addListener() {} }
  runInNewContext(source, {
    exports: {},
    require: () => ({ DEFAULT_ORIGIN_LIST: [] }),
    chrome: {
      runtime: {
        onMessage: { addListener: (listener) => listeners.push(listener) },
        onInstalled: event,
      },
      storage: {
        sync: { get: (callback) => callback({ originList: "[]" }) },
        onChanged: event,
      },
      tabs: { onUpdated: event },
      cookies: {
        set: async ({ name, value }) => written.push([name, value]),
        remove: async () => {},
      },
    },
    AbortController,
    URL,
    btoa,
    fetch: async () => new Response("ok"),
  })
  const response = await new Promise((resolve) => {
    listeners[0]({
      messageType: "send-req",
      data: {
        url: "https://example.test/",
        method: "GET",
        headers: { Cookie: cookie },
        wantsBinary: true,
      },
    }, { tab: { id: 1 } }, resolve)
  })
  assert.equal(response.data.error, null)
  return written
}

const cases = [
  ["ordinary value", "session=abc", [["session", "abc"]]],
  ["one padding character", "session=YWI=", [["session", "YWI="]]],
  ["two padding characters", "session=YQ==", [["session", "YQ=="]]],
  ["embedded equals signs", "session=a=b=c", [["session", "a=b=c"]]],
  ["value starting with equals", "session==abc", [["session", "=abc"]]],
  ["multiple cookies", "session=YQ==; mode=dark", [["session", "YQ=="], ["mode", "dark"]]],
  ["encoded equals sign", "session=a%3Db%3D", [["session", "a=b="]]],
  ["surrounding whitespace", " session = YQ== ", [["session", "YQ=="]]],
  ["missing separator", "invalid; mode=dark", [["mode", "dark"]]],
]

for (const [name, header, expected] of cases) {
  test(`preserves ${name} when setting request cookies`, async () => {
    assert.deepEqual(await sendCookieHeader(header), expected)
  })
}
