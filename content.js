(async function () {
  // --- DEBUGGING CONFIGURATION ---
  const DEBUG_MODE = true; // Set to true to enable debug logs, false to disable.

  function logDebug(message, ...args) {
    if (DEBUG_MODE) {
      console.log(`[BashDatDash Debug]: ${message}`, ...args);
    }
  }
  // -------------------------------

  logDebug("Content script loaded.");

  const data = await new Promise(resolve =>
    chrome.storage.sync.get(['enabled', 'replaceWhat', 'replaceWith', 'onboardingShown'], resolve)
  );
  const enabled = data.enabled ?? true; // Default to true if not set
  const { replaceWhat, replaceWith, onboardingShown } = data;

  logDebug("Settings retrieved:", { enabled, replaceWhat, replaceWith, onboardingShown });

  if (!enabled && onboardingShown) {
    logDebug("Extension is disabled and onboarding has been shown. Exiting.");
    return; // Only return if explicitly disabled AND onboarding has been shown
  }

  const dashPatterns = {
    em: /\u2014/g,
    en: /\u2013/g,
    both: /[\u2013\u2014]/g
  };
  const pattern = dashPatterns[replaceWhat || 'em'];
  const validReplacements = [', ', '; ', '--'];
  const replacement = validReplacements.includes(replaceWith) ? replaceWith : ', ';

  function replaceDashesInTextNode(node) {
    if (!pattern.test(node.nodeValue)) {
      logDebug("No dash pattern found in node:", node.nodeValue);
      return;
    }
    if (node.parentNode?.closest('[contenteditable="true"], input, textarea')) {
      logDebug("Skipping editable element:", node.nodeValue);
      return;
    }
    logDebug("Replacing dashes in node:", node.nodeValue);
    node.nodeValue = node.nodeValue.replace(pattern, replacement);
  }

  function walkAndReplace(el) {
    logDebug("Performing initial walk and replace on:", el);
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      replaceDashesInTextNode(node);
    }
  }

  function attachClipboardInterceptor() {
    logDebug("Attaching clipboard interceptor.");
    document.addEventListener('copy', e => {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) {
        logDebug("Clipboard: No selection or range count.");
        return;
      }
      const raw = sel.toString();
      const fixed = raw.replace(pattern, replacement);
      logDebug("Clipboard: Raw text - ", raw, " Fixed text - ", fixed);
      e.clipboardData.setData('text/plain', fixed);
      e.clipboardData.setData('text/html', fixed);
      e.preventDefault();
    });
  }

  function observeStreaming(chatRoot) {
    logDebug("Attaching MutationObserver to chat root:", chatRoot);
    const observer = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === 'characterData') {
          logDebug("MutationObserver: Character data change detected.", m.target.nodeValue);
          replaceDashesInTextNode(m.target);
        }
      }
    });
    observer.observe(chatRoot, { characterData: true, subtree: true });
  }

  const intervalMs = 200;
  const maxAttempts = 50;
  let attempts = 0;
  const retry = setInterval(() => {
    const chatRoot = document.querySelector('#thread');
    if (chatRoot) {
      logDebug("Chat root (#thread) found.", chatRoot);
      clearInterval(retry);
      if (enabled) {
        logDebug("Extension enabled. Performing replacements and attaching listeners.");
        walkAndReplace(chatRoot);
        observeStreaming(chatRoot);
        attachClipboardInterceptor();
      } else {
        logDebug("Extension disabled. Not performing replacements or attaching listeners.");
      }
      showOnboarding(enabled, onboardingShown);
    } else {
      logDebug(`Attempt ${attempts + 1}/${maxAttempts}: Chat root (#thread) not found.`);
    }
    if (++attempts >= maxAttempts) {
      clearInterval(retry);
      logDebug("Max attempts reached. Chat root not found. Exiting retry loop.");
    }
  }, intervalMs);

  async function showOnboarding(extensionEnabled, onboardingAlreadyShown) {
    logDebug("showOnboarding called. Onboarding already shown:", onboardingAlreadyShown);
    if (onboardingAlreadyShown) return; // Don't show if already shown

    logDebug("Displaying onboarding modal.");
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'bashdatdash-onboarding-overlay';
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(0,0,0,0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 99999;
    `;

    const modalContent = document.createElement('div');
    modalContent.id = 'bashdatdash-onboarding-content';
    modalContent.style.cssText = `
      background-color: #fff;
      padding: 25px;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      max-width: 450px;
      text-align: center;
      color: #333;
      font-family: sans-serif;
    `;

    modalContent.innerHTML = `
      <h2 style="color: #007bff; margin-top: 0;">Welcome to BashDatDash!</h2>
      <p style="line-height: 1.5;">
        This extension is now ${extensionEnabled ? '<strong>active</strong>' : 'disabled'}. 
        It replaces em-dashes and en-dashes in ChatGPT responses with a comma and space (by default).
      </p>
      <p style="font-size: 0.9em; color: #666;">
        You can customize these settings anytime by clicking the BashDatDash icon in your Chrome toolbar.
      </p>
      <button id="bashdatdash-onboarding-close" style="
        background-color: #007bff;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 1em;
        margin-top: 15px;
      ">Got It!</button>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    document.getElementById('bashdatdash-onboarding-close').addEventListener('click', () => {
      modalOverlay.remove();
      logDebug("Onboarding modal closed.");
    });

    chrome.storage.sync.set({ onboardingShown: true }, () => {
      logDebug("onboardingShown flag set to true in storage.");
    });
  }
})();