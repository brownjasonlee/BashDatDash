# BashDatDash Chrome Extension

BashDatDash is a lightweight Chrome extension designed to enhance your ChatGPT experience by replacing em-dashes (U+2014) and en-dashes (U+2013) in responses with a user-selected character or string (default: comma + space).

## Features

- **Automatic Dash Replacement:** Replaces em-dashes and/or en-dashes in streamed and initial ChatGPT text.
- **Clipboard Integration:** Modifies copied text to reflect your chosen dash replacements.
- **Customizable Settings:** Easily configure **which** dash types to replace and the replacement string via a simple popup UI.
- **Zero Overhead When Disabled:** The extension consumes no measurable runtime resources when turned off.

## Installation

1. Download the extension files from the [GitHub repository](https://github.com/brownjasonlee/BashDatDash).
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked" and select the directory where you downloaded the extension files.

## Usage

Once installed, BashDatDash will automatically activate on `chatgpt.com`. You can customize its behavior by clicking the extension icon in your Chrome toolbar. The popup will allow you to:

- Enable or disable the extension.
- Choose whether to replace em-dashes, en-dashes, or both.
- Select your preferred replacement string (e.g., comma + space, double hyphen, space, or nothing).

## Support

If you find BashDatDash helpful, you can support the developer by clicking the "☕ Buy me a coffee" button in the extension popup. 
