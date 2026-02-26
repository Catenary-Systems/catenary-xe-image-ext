 # XE Modal Extractor

Install locally in Chrome/Chromium:

1. Open `chrome://extensions` and enable "Developer mode".
2. Click "Load unpacked" and select the folder `xe-modal-extractor` inside this repository.
 3. Visit a page that contains elements you want to extract.
 4. Click the extension icon in the toolbar. A new "listing" tab will open.

 The listing page displays a grid of extracted images. From this page you can:
 - **Download images**: Downloads all found images, placing them in a subfolder if one is configured in the extension's options.
 - **Open content**: Opens the raw extracted HTML in a new tab.
 - **View logs**: Shows the last recorded error, for debugging.

Notes:
- The selectors used to find the content container and the images within it can be configured on the extension's options page.
- The extractor grabs the container's `outerHTML`; original page styles may not be fully applied.
