import { html, render } from "lit-html"
import { unsafeSVG } from "lit-html/directives/unsafe-svg"

import { DEFAULT_ORIGIN_LIST } from "./defaultOrigins"

const fs = require("fs")

const ICON_ADD = fs.readFileSync(__dirname + "/add-icon.svg", "utf8")
const ICON_DELETE = fs.readFileSync(__dirname + "/delete-icon.svg", "utf8")
const ICON_ERROR = fs.readFileSync(__dirname + "/error-icon.svg", "utf8")

let origins: string[] = []

let inputText = ""
let placeholderURL = "https://hoppscotch.io"
let errorMessage = ""

const getOriginList = () =>
  new Promise<string[]>((resolve, _) => {
    chrome.storage.sync.get(
      ["originList"],
      async (items: { [key: string]: string }) => {
        if (!items || !items.originList) {
          await storeOriginList(DEFAULT_ORIGIN_LIST)

          resolve(DEFAULT_ORIGIN_LIST)
        }
        resolve(JSON.parse(items.originList))
      }
    )
  })

const storeOriginList = (originList: string[]) =>
  new Promise<void>((resolve, _) => {
    chrome.storage.sync.set(
      {
        originList: JSON.stringify(originList),
      },
      () => {
        resolve()
      }
    )
  })

const onAddClick = (event: MouseEvent) => {
  event.preventDefault()

  try {
    const parsedURL = new URL(inputText)

    if (origins.includes(parsedURL.origin)) {
      errorMessage = "Origin is already on the list"
      render(page(), document.body)
    } else {
      origins.push(parsedURL.origin)
      inputText = ""

      storeOriginList(origins)

      errorMessage = ""

      render(page(), document.body)
    }
  } catch (e) {
    errorMessage = "Improper URL"
    render(page(), document.body)
  }
}

const onInputTextChange = (ev: InputEvent) => {
  inputText = (ev.target as HTMLInputElement).value

  errorMessage = ""

  render(page(), document.body)
}

const onDeleteOriginClicked = async (index: number) => {
  origins.splice(index, 1)
  await storeOriginList(origins)

  render(page(), document.body)
}

const page = () => html`
  ${inputField(inputText, onInputTextChange, onAddClick)}
  ${errorField(errorMessage)} ${originList(origins, onDeleteOriginClicked)}
`

const errorField = (error: string) => html`
  ${error.length > 0
    ? html`
        <div class="err">
          ${unsafeSVG(ICON_ERROR)}
          <span class="err-text"> ${error} </span>
        </div>
      `
    : html``}
`

const inputField = (
  inputText: string,
  onInputTextChange: (ev: InputEvent) => void,
  onAddClick: (ev: MouseEvent) => void
) => html`
  <form novalidate class="origin-input-box">
    <label class="origin-input-label" for="origin-input">Enter new origin</label>

    <div class="origin-input-wrapper">
      <input id="origin-input" required placeholder="${placeholderURL}" class="origin-input" .value=${inputText} @input=${onInputTextChange}></input>
      <button class="origin-add" type="submit" @click=${onAddClick}>
        ${unsafeSVG(ICON_ADD)}
        <span class="button-text">Add</span>
      </button>
    </div>
  </form>
`

const originList = (
  origins: string[],
  onDeleteClicked: (index: number) => void
) => html`
  <label class="origin-input-label">Active origins</label>
  <ul class="origin-list">
    ${origins.map(
      (origin, i) => html`
        <li class="origin-list-entry">
          <span class="origin-list-entry-origin">${origin}</span>
          <button
            class="origin-delete"
            .disabled=${origin === "https://hoppscotch.io"}
            @click=${() => onDeleteClicked(i)}
          >
            ${unsafeSVG(ICON_DELETE)}
          </button>
        </li>
      `
    )}
  </ul>
`

getOriginList()
  .then((list) => {
    origins = list

    render(page(), document.body)
  })
  .catch(() => {
    // Just fail silently :P
  })

chrome.tabs.query({ active: true }, (result) => {
  if (result.length > 0) {
    try {
      if (result[0].url) {
        if (!result[0].url.startsWith("http")) return

        const url = new URL(result[0].url)
        if (url && url.origin) {
          placeholderURL = url.origin
          inputText = url.origin
        }

        render(page(), document.body)
      }
    } catch (_e) {}
  }
})
