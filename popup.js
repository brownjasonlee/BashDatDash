chrome.storage.sync.get(['enabled', 'replaceWhat', 'replaceWith'], (data) => {
  // Set default values if not already present in storage
  const initialEnabled = data.enabled ?? true;
  const initialReplaceWhat = data.replaceWhat || 'em';
  const validReplaceWith = [', ', '; ', '--'];
  const initialReplaceWith = validReplaceWith.includes(data.replaceWith) ? data.replaceWith : ', ';

  document.getElementById('toggleEnabled').checked = initialEnabled;

  const replaceEm = document.getElementById('replaceEm');
  const replaceEn = document.getElementById('replaceEn');
  const replaceComma = document.getElementById('replaceComma');
  const replaceSemi = document.getElementById('replaceSemi');
  const replaceDoubleHyphen = document.getElementById('replaceDoubleHyphen');

  if (initialReplaceWhat === 'both') {
    replaceEm.checked = true;
    replaceEn.checked = true;
  } else if (initialReplaceWhat === 'en') {
    replaceEn.checked = true;
  } else {
    replaceEm.checked = true;
  }

  if (initialReplaceWith === '; ') {
    replaceSemi.checked = true;
  } else if (initialReplaceWith === '--') {
    replaceDoubleHyphen.checked = true;
  } else {
    replaceComma.checked = true;
  }

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

function updateReplaceWhat(e) {
  const replaceEm = document.getElementById('replaceEm');
  const replaceEn = document.getElementById('replaceEn');
  const em = replaceEm.checked;
  const en = replaceEn.checked;

  if (!em && !en) {
    // prevent deselecting all options
    e.target.checked = true;
    return;
  }

  let value = 'em';
  if (em && en) {
    value = 'both';
  } else if (en && !em) {
    value = 'en';
  }

  chrome.storage.sync.set({ replaceWhat: value });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'SETTINGS_UPDATED', replaceWhat: value }).catch(() => {
        console.log("BashDatDash: Content script not found or not ready to receive message.");
      });
    }
  });
}

document.getElementById('replaceEm').addEventListener('change', updateReplaceWhat);
document.getElementById('replaceEn').addEventListener('change', updateReplaceWhat);

function updateReplaceWith(target) {
  const options = Array.from(document.querySelectorAll('input[name="replaceWithOption"]'));

  if (target.checked) {
    options.forEach(cb => { if (cb !== target) cb.checked = false; });
  } else if (!options.some(cb => cb.checked)) {
    // prevent having none selected
    target.checked = true;
    return;
  }

  const checked = options.find(cb => cb.checked) || target;
  const value = checked.value;

  chrome.storage.sync.set({ replaceWith: value });
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'SETTINGS_UPDATED', replaceWith: value }).catch(() => {
        console.log("BashDatDash: Content script not found or not ready to receive message.");
      });
    }
  });
}

document.getElementById('replaceComma').addEventListener('change', (e) => updateReplaceWith(e.target));
document.getElementById('replaceSemi').addEventListener('change', (e) => updateReplaceWith(e.target));
document.getElementById('replaceDoubleHyphen').addEventListener('change', (e) => updateReplaceWith(e.target));
