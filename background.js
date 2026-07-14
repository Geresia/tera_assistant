chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Auto-login: inject tera_login.js whenever a tera tab lands on /login/
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url?.startsWith('https://tera.traveloka.com/login')) return;
  chrome.scripting.executeScript({
    target: { tabId },
    files: ['tera_login.js'],
  }).catch(() => {});
});
