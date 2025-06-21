chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['enabled', 'replaceWhat', 'replaceWith', 'onboardingShown'], (data) => {
    const defaultSettings = {
      enabled: data.enabled ?? true,
      replaceWhat: data.replaceWhat || 'em',
      replaceWith: data.replaceWith || ', ',
      onboardingShown: data.onboardingShown ?? false
    };
    chrome.storage.sync.set(defaultSettings);
    console.log("Default settings applied on installation/update:", defaultSettings);
  });
}); 