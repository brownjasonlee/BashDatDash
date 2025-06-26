let replaceEm, replaceEn, replaceComma, replaceSemi, replaceDoubleHyphen;
let exampleCounter, beforeSentence, afterSentence;

const examples = [
  'The quick\u2014brown\u2014fox jumps over the lazy dog.',
  'An up\u2013to\u2013date record\u2014like this\u2014works well.',
  'She paused\u2014thinking\u2014before speaking.',
  'Using dashes\u2014such as these\u2014can be tricky.'
];
let currentExample = 0;

function applyReplacement(text) {
  const replaceWith = document.querySelector('input[name="replaceWithOption"]:checked').value;
  let result = text;
  if (replaceEm && replaceEm.checked) {
    result = result.replace(/\u2014/g, replaceWith);
  }
  if (replaceEn && replaceEn.checked) {
    result = result.replace(/\u2013/g, replaceWith);
  }
  return result;
}

function updatePreview() {
  if (!exampleCounter) return;
  const total = examples.length;
  exampleCounter.textContent = `${currentExample + 1}/${total}`;
  const before = examples[currentExample];
  beforeSentence.textContent = before;
  afterSentence.textContent = applyReplacement(before);
}

document.getElementById('prevExample').addEventListener('click', () => {
  currentExample = (currentExample - 1 + examples.length) % examples.length;
  updatePreview();
});

document.getElementById('nextExample').addEventListener('click', () => {
  currentExample = (currentExample + 1) % examples.length;
  updatePreview();
});

chrome.storage.sync.get(['enabled', 'replaceWhat', 'replaceWith'], (data) => {
  // Set default values if not already present in storage
  const initialEnabled = data.enabled ?? true;
  const initialReplaceWhat = data.replaceWhat || 'em';
  const validReplaceWith = [', ', '; ', '--'];
  const initialReplaceWith = validReplaceWith.includes(data.replaceWith) ? data.replaceWith : ', ';

  document.getElementById('toggleEnabled').checked = initialEnabled;

  replaceEm = document.getElementById('replaceEm');
  replaceEn = document.getElementById('replaceEn');
  replaceComma = document.getElementById('replaceComma');
  replaceSemi = document.getElementById('replaceSemi');
  replaceDoubleHyphen = document.getElementById('replaceDoubleHyphen');
  exampleCounter = document.getElementById('exampleCounter');
  beforeSentence = document.getElementById('beforeSentence');
  afterSentence = document.getElementById('afterSentence');

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

  updatePreview();
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

  updatePreview();
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

  updatePreview();
}

document.getElementById('replaceComma').addEventListener('change', (e) => updateReplaceWith(e.target));
document.getElementById('replaceSemi').addEventListener('change', (e) => updateReplaceWith(e.target));
document.getElementById('replaceDoubleHyphen').addEventListener('change', (e) => updateReplaceWith(e.target));
