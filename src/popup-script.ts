import { html, render } from "lit-html";
import { DEFAULT_ORIGIN_LIST } from "./defaultOrigins";

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
  <h1>Hoppscotch Extension!</h1>
  This is the popup page!
  ${inputField(inputText, onInputTextChange, onAddClick)}
  ${originList(origins, onDeleteOriginClicked)} 
`;

const inputField = (inputText: string, onInputTextChange: (ev: InputEvent) => void, onAddClick: () => void) => html`
  <div>
    <input .value=${inputText} @change=${onInputTextChange}></input>
    <button @click=${onAddClick}>Add</button>
  </div>
`;

const originList = (origins: string[], onDeleteClicked: (index: number) => void) => html`
  <ul>
    ${
      origins.map((origin, i) => html`
        <li>
          ${origin}
          <button @click=${() => onDeleteClicked(i)}>Delete</button>
        </li>
      `)
    }
  </ul>
`;

getOriginList().then((list) => {
  origins = list;

  render(page(), document.body); 
});
