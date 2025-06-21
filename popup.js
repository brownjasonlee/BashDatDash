chrome.storage.sync.get(['enabled', 'replaceWhat', 'replaceWith'], (data) => {
  // Set default values if not already present in storage
  const initialEnabled = data.enabled ?? true;
  const initialReplaceWhat = data.replaceWhat || 'em';
  const validReplaceWith = [', ', '; ', '--'];
  const initialReplaceWith = validReplaceWith.includes(data.replaceWith) ? data.replaceWith : ', ';

  document.getElementById('toggleEnabled').checked = initialEnabled;
  document.getElementById('replaceWhat').value = initialReplaceWhat;
  document.getElementById('replaceWith').value = initialReplaceWith;

  // Save defaults to storage if they were undefined
  chrome.storage.sync.set({
    enabled: initialEnabled,
    replaceWhat: initialReplaceWhat,
    replaceWith: initialReplaceWith
  });
});

document.getElementById('toggleEnabled').addEventListener('change', (e) => {
  const enabled = e.target.checked;
  chrome.storage.sync.set({ enabled });
  // Send message to content script about the new enabled state
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'SETTINGS_UPDATED', enabled }).catch(() => {
        // Catch the error if the receiving end does not exist (e.g., ChatGPT tab not open)
        console.log("BashDatDash: Content script not found or not ready to receive message.");
      });
    }
  });
});

document.getElementById('replaceWhat').addEventListener('change', (e) => {
  chrome.storage.sync.set({ replaceWhat: e.target.value });
  // Send message to content script about the new replaceWhat value
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'SETTINGS_UPDATED', replaceWhat: e.target.value }).catch(() => {
        console.log("BashDatDash: Content script not found or not ready to receive message.");
      });
    }
  });
});

document.getElementById('replaceWith').addEventListener('change', (e) => {
  chrome.storage.sync.set({ replaceWith: e.target.value });
  // Send message to content script about the new replaceWith value
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'SETTINGS_UPDATED', replaceWith: e.target.value }).catch(() => {
        console.log("BashDatDash: Content script not found or not ready to receive message.");
      });
    }
  });
});
