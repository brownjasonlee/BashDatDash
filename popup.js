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
  chrome.storage.sync.set({ enabled: e.target.checked });
});

document.getElementById('replaceWhat').addEventListener('change', (e) => {
  chrome.storage.sync.set({ replaceWhat: e.target.value });
});

document.getElementById('replaceWith').addEventListener('change', (e) => {
  chrome.storage.sync.set({ replaceWith: e.target.value });
});
