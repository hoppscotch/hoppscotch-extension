const assert = require("node:assert/strict")
const { readFileSync } = require("node:fs")
const { join } = require("node:path")
const { test } = require("node:test")
const { runInNewContext } = require("node:vm")

const source = readFileSync(join(__dirname, "../src/hookContent.js"), "utf8")

function setupHook() {
  const listeners = new Set()
  const window = {
    addEventListener: (_, listener) => listeners.add(listener),
    removeEventListener: (_, listener) => listeners.delete(listener),
    postMessage: () => {},
  }
  runInNewContext(source, {
    window,
    File: class File {},
    FormData: class FormData {},
  })
  return {
    hook: window.__POSTWOMAN_EXTENSION_HOOK__,
    respond(data) {
      for (const listener of listeners) listener({ source: window, data })
    },
    listeners,
  }
}

for (const text of ["", "f", "fo", "foo", "foob", "fooba", "foobar", "{}\0\0"]) {
  test(`decodes ${JSON.stringify(text)} without adding or removing bytes`, () => {
    const { hook } = setupHook()
    const input = Buffer.from(text)
    const output = hook.decodeB64ToArrayBuffer(input.toString("base64"))
    assert.deepEqual(Buffer.from(output), input)
  })
}

test("preserves arbitrary binary bytes", () => {
  const { hook } = setupHook()
  const input = Buffer.from([0, 255, 128, 1])
  assert.deepEqual(
    Buffer.from(hook.decodeB64ToArrayBuffer(input.toString("base64"))),
    input
  )
})

test("ignores whitespace before calculating decoded length", () => {
  const { hook } = setupHook()
  assert.deepEqual(
    Buffer.from(hook.decodeB64ToArrayBuffer(" Zg==\r\n")),
    Buffer.from("f")
  )
})

test("can decode into a caller-provided buffer", () => {
  const { hook } = setupHook()
  const buffer = new ArrayBuffer(1)
  const output = hook.decodeB64ToArrayBuffer("Zg==", buffer)
  assert.equal(output.buffer, buffer)
  assert.equal(new Uint8Array(buffer)[0], 102)
})

test("binary responses use the exact decoded byte length", async () => {
  const { hook, respond, listeners } = setupHook()
  const pending = hook.sendRequest({})
  respond({
    type: "__POSTWOMAN_EXTENSION_RESPONSE__",
    isBinary: true,
    response: { data: "Zg==" },
  })
  const response = await pending
  assert.deepEqual(Buffer.from(response.data), Buffer.from("f"))
  assert.equal(listeners.size, 0)
})

test("error responses use the exact decoded byte length", async () => {
  const { hook, respond, listeners } = setupHook()
  const pending = hook.sendRequest({})
  respond({
    type: "__POSTWOMAN_EXTENSION_ERROR__",
    error: { message: "Request failed", response: { data: "Zm8=" } },
  })
  await assert.rejects(pending, (error) => {
    assert.equal(error.message, "Request failed")
    assert.deepEqual(Buffer.from(error.response.data), Buffer.from("fo"))
    return true
  })
  assert.equal(listeners.size, 0)
})
