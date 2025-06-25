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

  const validReplacements = [', ', '; ', '--'];
  const replacement = validReplacements.includes(replaceWith) ? replaceWith : ', ';

  let chatRootObserver = null; // Declare observer globally for management
  let copyListenerAttached = false; // Track clipboard listener state
  let chatGPTCopyButtonListenerAttached = false; // New: Track ChatGPT copy listener state

  logDebug("Settings retrieved:", { enabled, replaceWhat, storedReplaceWith: replaceWith, effectiveReplacement: replacement, onboardingShown });

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

  // Function to activate/deactivate the extension's core logic
  function setExtensionActiveState(isActive) {
    if (isActive) {
      logDebug("Activating extension features.");
      // Re-attach observer and listeners if not already active
      const chatRoot = document.querySelector('#thread');
      if (chatRoot) {
        walkAndReplace(chatRoot); // Re-process all existing text
        if (!chatRootObserver) {
          chatRootObserver = observeStreaming(chatRoot);
        }
        if (!copyListenerAttached) {
          attachClipboardInterceptor();
          copyListenerAttached = true;
        }
        // New: Attach delegated listener for ChatGPT's copy buttons
        if (!chatGPTCopyButtonListenerAttached) {
          attachChatGPTCopyButtonDelegatedListener(chatRoot);
          chatGPTCopyButtonListenerAttached = true;
        }
      } else {
        logDebug("Chat root not found during activation attempt. Will retry.");
        // The retry interval will handle finding chatRoot and then activate
      }
    } else {
      logDebug("Deactivating extension features.");
      if (chatRootObserver) {
        chatRootObserver.disconnect();
        chatRootObserver = null;
      }
      if (copyListenerAttached) {
        document.removeEventListener('copy', handleClipboardCopy);
        copyListenerAttached = false;
      }
      // New: Remove delegated listener for ChatGPT's copy buttons
      if (chatGPTCopyButtonListenerAttached) {
        const chatRoot = document.querySelector('#thread');
        if (chatRoot) {
          chatRoot.removeEventListener('click', handleChatGPTCopyButtonClickDelegated);
        }
        chatGPTCopyButtonListenerAttached = false;
      }
    }
  }

  // Separate the clipboard handler function to allow easy removal
  function handleClipboardCopy(e) {
    logDebug("Clipboard: Copy event triggered.");
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
  }

  function attachClipboardInterceptor() {
    logDebug("Attaching clipboard interceptor.");
    document.addEventListener('copy', handleClipboardCopy);
  }

  function observeStreaming(chatRoot) {
    logDebug("Attaching MutationObserver to chat root:", chatRoot);
    const observer = new MutationObserver(muts => {
      for (const m of muts) {
        // Check if the mutation target or its ancestor is an editable element
        if (m.target.closest && m.target.closest('[contenteditable="true"], input, textarea')) {
          logDebug("MutationObserver: Skipping editable element or its child for all processing.", m.target);
          continue; // Skip this mutation entirely
        }

        if (m.type === 'characterData') {
          logDebug("MutationObserver: Character data change detected.", m.target.nodeValue);
          replaceDashesInTextNode(m.target);
        } else if (m.type === 'childList' && m.addedNodes.length > 0) {
          logDebug("MutationObserver: Child list change detected. Added nodes:", m.addedNodes.length);
          m.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // This check is still useful for initial walk on newly added elements
              if (node.closest('[contenteditable="true"], input, textarea')) {
                logDebug("Skipping newly added editable element or its child for walkAndReplace (from childList).");
                return;
              }
              walkAndReplace(node);
            }
          });
        }
      }
    });
    observer.observe(chatRoot, { childList: true, characterData: true, subtree: true });
    return observer;
  }

  // Listen for messages from the popup or background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    logDebug("Message received in content script:", message);
    if (message.type === 'SETTINGS_UPDATED') {
      // Re-fetch settings or use message data to update internal state
      chrome.storage.sync.get(['enabled', 'replaceWhat', 'replaceWith'], (updatedData) => {
        const newEnabledState = updatedData.enabled ?? true;
        // Update pattern and replacement if replaceWhat/With also changed
        // (though current message only sends 'enabled')
        // For simplicity, re-init the whole state based on new settings.
        // If replaceWhat or replaceWith can be changed dynamically, you'd re-calculate pattern/replacement here.

        setExtensionActiveState(newEnabledState);
      });
    } else if (message.type === 'UPDATE_DASH_SETTINGS') {
      // This message type could be used if replaceWhat/With were changed dynamically
      // For now, we only respond to general SETTINGS_UPDATED from popup
      const newReplaceWhat = message.replaceWhat || 'em';
      const newReplaceWith = message.replaceWith || ', ';

      // Update the pattern and replacement variables here
      // This requires the pattern and replacement to be non-const if they are to be updated dynamically
      // For this step, we'll keep them as const and rely on re-activation to pick new settings.
      logDebug("Received dynamic dash setting update, but not dynamically re-applying patterns. Reload page for full effect if not already handled by full SETTINGS_UPDATED message.");
    }
  });

  // Initial setup: activate if enabled, or just show onboarding if first run.
  const intervalMs = 200;
  const maxAttempts = 50;
  let attempts = 0;
  const retry = setInterval(() => {
    const chatRoot = document.querySelector('#thread');
    if (chatRoot) {
      logDebug("Chat root (#thread) found.", chatRoot);
      clearInterval(retry);
      if (enabled) {
        logDebug("Extension enabled initially. Performing replacements and attaching listeners.");
        setExtensionActiveState(true);
      } else {
        logDebug("Extension disabled initially. Not performing replacements or attaching listeners.");
      }
      // No need to call attachChatGPTCopyButtonListeners here anymore, it's handled by setExtensionActiveState
      showOnboarding(enabled, onboardingShown);
    } else {
      logDebug(`Attempt ${attempts + 1}/${maxAttempts}: Chat root (#thread) not found.`);
    }
    if (++attempts >= maxAttempts) {
      clearInterval(retry);
      logDebug("Max attempts reached. Chat root not found. Exiting retry loop.");
    }
  }, intervalMs);

  // New: Delegated event listener for ChatGPT's copy buttons
  function attachChatGPTCopyButtonDelegatedListener(rootElement) {
    logDebug("Attaching delegated ChatGPT copy button listener.");
    rootElement.addEventListener('click', handleChatGPTCopyButtonClickDelegated);
  }

  // New: Delegated handler for ChatGPT's copy button clicks
  function handleChatGPTCopyButtonClickDelegated(e) {
    logDebug("Delegated handler called. Event target:", e.target);
    const copyButton = e.target.closest('button[data-testid="copy-turn-action-button"]');
    logDebug("Delegated handler - copyButton (closest result):", copyButton);

    if (copyButton) {
      logDebug("Delegated ChatGPT copy button clicked.", copyButton);
      e.preventDefault(); // Prevent ChatGPT's default copy behavior
      e.stopImmediatePropagation(); // Stop propagation to prevent other handlers from running

      // Find the text content associated with this copy button
      let textContentElement = copyButton.closest('.markdown.prose');
      if (!textContentElement) {
        textContentElement = copyButton.closest('div[data-testid^="conversation-message"]');
      }

      if (textContentElement) {
        const rawText = textContentElement.innerText || textContentElement.textContent;
        const fixedText = rawText.replace(pattern, replacement);
        logDebug("Delegated ChatGPT Copy: Raw text from element:", rawText);
        logDebug("Delegated ChatGPT Copy: Fixed text for clipboard:", fixedText);

        navigator.clipboard.writeText(fixedText)
          .then(() => logDebug("Delegated: Text successfully copied to clipboard via custom handler."))
          .catch(err => console.error("BashDatDash Error: Delegated: Failed to copy text via custom handler:", err));
      } else {
        logDebug("Delegated ChatGPT Copy: Could not find associated text content element to copy.");
      }
    } else {
      logDebug("Delegated handler: Clicked element is not a copy button or its descendant.");
    }
  }

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