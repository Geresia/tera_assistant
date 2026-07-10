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

// Auto account chooser: inject google_account.js on Google OAuth for Traveloka
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url?.startsWith('https://accounts.google.com/')) return;
  if (!tab.url.includes('traveloka')) return;
  chrome.scripting.executeScript({
    target: { tabId },
    files: ['google_account.js'],
  }).catch(() => {});
});