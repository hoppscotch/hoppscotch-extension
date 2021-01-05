import { html, render } from "lit-html";
import { unsafeSVG } from "lit-html/directives/unsafe-svg";

import { DEFAULT_ORIGIN_LIST } from "./defaultOrigins";

import { readFileSync } from "fs";

const ICON_ADD = readFileSync(__dirname + "/add-icon.svg", "utf-8");
const ICON_DELETE = readFileSync(__dirname + "/delete-icon.svg", "utf-8");


let origins: string[] = [];

let inputText = "";

const getOriginList = () => new Promise<string[]>((resolve, _) => {
  chrome.storage.sync.get(['originList'], async (items: { [key: string]: any }) => { 
    if (!items || !items.originList) {
      await storeOriginList(DEFAULT_ORIGIN_LIST);

      resolve(DEFAULT_ORIGIN_LIST);
    }
    resolve(JSON.parse(items.originList));
  });
});

const storeOriginList = (originList: string[]) => new Promise((resolve, _) => {
  chrome.storage.sync.set({
    originList: JSON.stringify(originList)
  }, () => {
    resolve();
  });
});

const onAddClick = () => {
  try {
    const parsedURL = new URL(inputText);

    origins.push(parsedURL.origin);
    inputText = "";

    storeOriginList(origins);

    render(page(), document.body);
  } catch (e) {
    alert("Improper URL");
  }
}

const onInputTextChange = (ev: InputEvent) => {
  inputText = (ev.target as HTMLInputElement).value;

  render(page(), document.body);
}

const onDeleteOriginClicked = async (index: number) => {
  origins.splice(index, 1);
  await storeOriginList(origins);

  render(page(), document.body);
    }

const page = () => html`
  ${inputField(inputText, onInputTextChange, onAddClick)}
  ${originList(origins, onDeleteOriginClicked)} 
`;

const inputField = (inputText: string, onInputTextChange: (ev: InputEvent) => void, onAddClick: () => void) => html`
  <form novalidate class="origin-input-box">
    <label class="origin-input-label" for="origin-input">Enter new origin</label>

    <div class="origin-input-wrapper">
      <input id="origin-input" required placeholder="https://hoppscotch.io" class="origin-input" .value=${inputText} @change=${onInputTextChange}></input>
      <button class="origin-add" type="submit" @click=${onAddClick}>
        ${unsafeSVG(ICON_ADD)}
        <span class="button-text">Add</span>
      </button>
    </div>
  </form>
`;

const originList = (origins: string[], onDeleteClicked: (index: number) => void) => html`
  <label class="origin-input-label">Active origins</label>
  <ul class="origin-list">
    ${
      origins.map((origin, i) => html`
        <li class="origin-list-entry">
          <span class="origin-list-entry-origin">${origin}</span>
          <button class="origin-delete" @click=${() => onDeleteClicked(i)}>
            ${unsafeSVG(ICON_DELETE)}
          </button>
        </li>
      `)
    }
  </ul>
`;

getOriginList().then((list) => {
  origins = list;

  render(page(), document.body); 
});
