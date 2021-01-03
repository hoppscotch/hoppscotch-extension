import { html, render } from "lit-html";

let origins = [ "https://postwoman.io/", "https://postwoman.netlify.app/" ];

let inputText = "";

const getOriginList = () => new Promise<string[]>((resolve, _) => {
  (chrome.storage.sync as any).get(['originList'], (result: any) => { 
    if (!result || !result.originList) resolve([]);
    resolve(JSON.parse(result.originList));
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
  origins.push(inputText);
  inputText = "";

  storeOriginList(origins);

  render(page(), document.body);
}

const onInputTextChange = (ev: InputEvent) => {
  inputText = (ev.target as HTMLInputElement).value;

  render(page(), document.body);
}

const page = () => html`
  <h1>Hoppscotch Extension!</h1>
  This is the popup page!
  ${inputField(inputText, onInputTextChange, onAddClick)}
  ${originList(origins)} 
`;

const inputField = (inputText: string, onInputTextChange: (ev: InputEvent) => void, onAddClick: () => void) => html`
  <div>
    <input .value=${inputText} @change=${onInputTextChange}></input>
    <button @click=${onAddClick}>Add</button>
  </div>
`;

const originList = (origins: string[]) => html`
  <ul>
    ${
      origins.map(e => html`
        <li>
          ${e}
        </li>
      `)
    }
  </ul>
`;

getOriginList().then((list) => {
  origins = list;

  render(page(), document.body); 
});
