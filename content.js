(async function () {
  const data = await new Promise(resolve =>
    chrome.storage.sync.get(['enabled', 'replaceWhat', 'replaceWith', 'onboardingShown'], resolve)
  );
  const enabled = data.enabled ?? true; // Default to true if not set
  const { replaceWhat, replaceWith, onboardingShown } = data;

  if (!enabled && onboardingShown) return; // Only return if explicitly disabled AND onboarding has been shown

  const dashPatterns = {
    em: /\u2014/g,
    en: /\u2013/g,
    both: /[\u2013\u2014]/g
  };
  const pattern = dashPatterns[replaceWhat || 'em'];
  const replacement = replaceWith ?? ', ';

  function replaceDashesInTextNode(node) {
    if (!pattern.test(node.nodeValue)) return;
    if (node.parentNode?.closest('[contenteditable="true"], input, textarea')) return;
    node.nodeValue = node.nodeValue.replace(pattern, replacement);
  }

  function walkAndReplace(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      replaceDashesInTextNode(node);
    }
  }

  function attachClipboardInterceptor() {
    document.addEventListener('copy', e => {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const raw = sel.toString();
      const fixed = raw.replace(pattern, replacement);
      e.clipboardData.setData('text/plain', fixed);
      e.clipboardData.setData('text/html', fixed);
      e.preventDefault();
    });
  }

  function observeStreaming(chatRoot) {
    const observer = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === 'characterData') {
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
      clearInterval(retry);
      if (enabled) {
        walkAndReplace(chatRoot);
        observeStreaming(chatRoot);
        attachClipboardInterceptor();
      }
      showOnboarding(enabled, onboardingShown);
    }
    if (++attempts >= maxAttempts) clearInterval(retry);
  }, intervalMs);

  async function showOnboarding(extensionEnabled, onboardingAlreadyShown) {
    if (onboardingAlreadyShown) return; // Don't show if already shown

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
    });

    chrome.storage.sync.set({ onboardingShown: true });
  }
})();