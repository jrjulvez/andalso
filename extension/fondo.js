// and also · extensión: abre la página o el texto seleccionado en and also, que empieza a leer solo.
const APP = 'https://jrjulvez.github.io/andalso/';
const abrir = (texto, url) => {
  const q = new URLSearchParams();
  if (texto) q.set('t', texto.slice(0, 1500));
  if (url && /^https?:/.test(url)) q.set('u', url);
  q.set('go', '1');
  chrome.tabs.create({ url: APP + '?' + q.toString() });
};
chrome.action.onClicked.addListener(tab => abrir(tab.title || '', tab.url));
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'pagina', title: 'Cuéntame el resto de esta página', contexts: ['page', 'link'] });
  chrome.contextMenus.create({ id: 'seleccion', title: 'Cuéntame el resto de «%s»', contexts: ['selection'] });
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'seleccion') abrir(info.selectionText, tab && tab.url);
  else abrir(info.linkUrl ? '' : (tab && tab.title) || '', info.linkUrl || (tab && tab.url));
});
