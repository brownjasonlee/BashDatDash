chrome.storage.sync.get(['enabled', 'replaceWhat', 'replaceWith'], (data) => {
  document.getElementById('toggleEnabled').checked = data.enabled ?? true;
  document.getElementById('replaceWhat').value = data.replaceWhat || 'em';
  const validReplaceWith = [', ', '; ', '--'];
  document.getElementById('replaceWith').value = validReplaceWith.includes(data.replaceWith) ? data.replaceWith : ', ';
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
