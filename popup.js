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
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'SETTINGS_UPDATED', enabled });
    }
  });
});

document.getElementById('replaceWhat').addEventListener('change', (e) => {
  chrome.storage.sync.set({ replaceWhat: e.target.value });
  // Send message to content script about the new replaceWhat value (optional, but good for consistency)
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'SETTINGS_UPDATED', replaceWhat: e.target.value });
    }
  });
});

document.getElementById('replaceWith').addEventListener('change', (e) => {
  chrome.storage.sync.set({ replaceWith: e.target.value });
  // Send message to content script about the new replaceWith value (optional, but good for consistency)
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'SETTINGS_UPDATED', replaceWith: e.target.value });
    }
  });
});
