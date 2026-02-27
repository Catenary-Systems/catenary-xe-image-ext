# xe.gr Image Extractor
### Google chrome extension

![Last Commit](https://img.shields.io/github/last-commit/Catenary-Systems/catenary-xe-image-ext)
![Commits](https://img.shields.io/github/commit-activity/y/Catenary-Systems/catenary-xe-image-ext/main)
![Codesize](https://img.shields.io/github/languages/code-size/Catenary-Systems/catenary-xe-image-ext)

Extracts images from a listing in xe.gr using html tags to isolate listing images from extra junk

### Features:
- Extract all images from tags
- Download them
- [Options](#options) menu to change extracted tag

##### Notes:
- The extractor grabs the element's outerHTML; page styles from the original site may not be included.
- If no element is found, a message tab will be opened.

### Options:

- Change download subfolder _(currently broken)_
- Change extracted outer tag
- Change extracted inner tag

### Install:

##### Step 1:

- Download the code from github
- Extract the zip file
- Put the folder somewhere **Safe** where it will not be deleted

##### Step 2:

- Open Chrome or Chromium (or any Chromium based browser)
- Go into the extensions page
- Turn on `Developer mode` toggle
- Click the `Load Unpacked` Button

##### And you're done

### Usage:

- Go on a **xe.gr** listing containing images
- Click an image to go on a view of all images _(important)_
> It opens a new tab with a preview of all images in a grid

> You can also click the `Download All Images` button to download them

