const runtimeExtracts = {};

// Map from resource URL -> desired filename (including subfolder) to enforce via onDeterminingFilename
const pendingDesiredFilenameByUrl = {};

chrome.downloads && chrome.downloads.onDeterminingFilename && chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  try {
    const key = downloadItem.finalUrl || downloadItem.url;
    const desired = pendingDesiredFilenameByUrl[key] || pendingDesiredFilenameByUrl[downloadItem.url];
    if (desired) {
      suggest({ filename: desired });
      delete pendingDesiredFilenameByUrl[key];
      delete pendingDesiredFilenameByUrl[downloadItem.url];
    } else {
      suggest();
    }
  } catch (e) {
    try { suggest(); } catch (e2) {}
  }
});

// persistent last error log (in-memory, and saved to storage when possible)
let lastErrorLog = null;
function recordError(err) {
  try {
    const entry = { time: new Date().toISOString(), message: String(err && err.message ? err.message : err), stack: err && err.stack ? String(err.stack) : null };
    lastErrorLog = entry;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && typeof chrome.storage.local.set === 'function') {
      chrome.storage.local.set({ lastErrorLog: entry }, () => {});
    }
  } catch (e) {
    // ignore
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'getExtract' && msg.id) {
    sendResponse({ ok: true, data: runtimeExtracts[msg.id] || null });
    return true;
  }
  if (msg && msg.type === 'downloadImages' && Array.isArray(msg.images)) {
    const folder = msg.folder || '';
    const images = msg.images;
    const results = [];
    (async () => {
      for (const u of images) {
        try {
          const filename = (folder ? (folder.replace(/(^\/|\/$)/g,'') + '/') : '') + (new URL(u).pathname.split('/').filter(Boolean).pop() || 'image');
          const id = await chrome.downloads.download({ url: u, filename, conflictAction: 'uniquify' });
          results.push({ url: u, id });
        } catch (e) {
          results.push({ url: u, error: String(e) });
          recordError(e);
        }
      }
      sendResponse({ ok: true, results });
    })();
    return true; // indicate async response
  }
  if (msg && msg.type === 'getLastErrorLog') {
    sendResponse({ ok: true, lastErrorLog });
    return true;
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (!tab?.id) return;
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      function absoluteUrl(url) {
        try { return new URL(url, location.href).href; } catch(e) { return null; }
      }
      const el = document.querySelector('.grid-x.image-grid-wrapper');
      const html = el ? el.outerHTML : '';
      const imgs = new Set();
      // Collect images only from .cell.small-6.image-item elements when present
      const cells = Array.from(document.querySelectorAll('.cell.small-6.image-item'));
      if (cells.length) {
        cells.forEach(cell => {
          // If the cell contains anchor(s) with href, prefer those hrefs as the image sources.
          const anchors = Array.from(cell.querySelectorAll('a[href]'));
          if (anchors.length) {
            anchors.forEach(a => { try { if (a.href) imgs.add(absoluteUrl(a.href)); } catch(e){} });
            // still collect data-url attributes on elements that are NOT inside those anchors
            cell.querySelectorAll('[data-url]').forEach(el => {
              if (el.closest('a')) return; // skip data-url inside anchor
              try { const u = el.getAttribute('data-url'); if (u) imgs.add(absoluteUrl(u)); } catch(e){}
            });
            // collect background-images that are not inside anchors
            cell.querySelectorAll('*').forEach(elm => {
              if (elm.closest('a')) return;
              const bg = getComputedStyle(elm).getPropertyValue('background-image');
              if (!bg || bg === 'none') return;
              const urls = [...bg.matchAll(/url\((?:"|'|)(.*?)(?:"|'|)\)/g)].map(m => m[1]);
              urls.forEach(u => { const abs = absoluteUrl(u); if (abs) imgs.add(abs); });
            });
          } else {
            // no anchors: gather images normally
            cell.querySelectorAll('img').forEach(i => { if (i.src) imgs.add(absoluteUrl(i.src)); });
            cell.querySelectorAll('source').forEach(s => {
              if (s.src) imgs.add(absoluteUrl(s.src));
              if (s.srcset) s.srcset.split(',').forEach(part => { const u = part.trim().split(' ')[0]; if (u) imgs.add(absoluteUrl(u)); });
            });
            cell.querySelectorAll('[data-url]').forEach(el => { try { const u = el.getAttribute('data-url'); if (u) imgs.add(absoluteUrl(u)); } catch(e){} });
            cell.querySelectorAll('*').forEach(elm => {
              const bg = getComputedStyle(elm).getPropertyValue('background-image');
              if (!bg || bg === 'none') return;
              const urls = [...bg.matchAll(/url\((?:"|'|)(.*?)(?:"|'|)\)/g)].map(m => m[1]);
              urls.forEach(u => { const abs = absoluteUrl(u); if (abs) imgs.add(abs); });
            });
          }
        });
      } else {
        // fallback: collect from whole document
        document.querySelectorAll('img').forEach(i => { if (i.src) imgs.add(absoluteUrl(i.src)); });
        document.querySelectorAll('source').forEach(s => { if (s.src) imgs.add(absoluteUrl(s.src)); if (s.srcset) s.srcset.split(',').forEach(part => { const u = part.trim().split(' ')[0]; if (u) imgs.add(absoluteUrl(u)); }); });
        document.querySelectorAll('*').forEach(elm => {
          const bg = getComputedStyle(elm).getPropertyValue('background-image');
          if (!bg || bg === 'none') return;
          const urls = [...bg.matchAll(/url\((?:"|'|)(.*?)(?:"|'|)\)/g)].map(m => m[1]);
          urls.forEach(u => { const abs = absoluteUrl(u); if (abs) imgs.add(abs); });
        });
      }
      const images = Array.from(imgs).filter(Boolean);
      return { html, images };
    }
  }).then((results) => {
    const res = results?.[0]?.result;
    if (!res) {
      const noFound = '<!doctype html><meta charset="utf-8"><title>XE Modal Extractor</title><p>Unable to extract content.</p>';
      chrome.tabs.create({ url: 'data:text/html;charset=utf-8,' + encodeURIComponent(noFound) });
      return;
    }
    (function saveAndOpen() {
      const id = String(Date.now()) + '-' + Math.random().toString(36).slice(2,8);
      runtimeExtracts[id] = { html: res.html || '', images: res.images || [] };
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL && chrome.tabs) {
          chrome.tabs.create({ url: chrome.runtime.getURL('listing.html') + '?id=' + encodeURIComponent(id) });
          return;
        }
      } catch (e) {
        console.warn('background: unable to open listing.html', e);
      }
      // fallback: open a data URL listing with the extracted content embedded
      try {
        const images = JSON.stringify(res.images || []);
        const listing = `<!doctype html>
<meta charset="utf-8">
<title>Extracted Content</title>
<style>body{font-family:Arial,Helvetica,sans-serif;padding:16px}.container{border:1px solid #ddd;padding:12px}</style>
<div>
  <button id="downloadBtn">Download images</button>
  <span id="status"></span>
</div>
<div class="container">${(res.html||'')}</div>
<script>
  (function(){
    const images = ${images};
    const btn = document.getElementById('downloadBtn');
    const status = document.getElementById('status');
    btn.addEventListener('click', function(){
      if (!images || !images.length) { status.textContent = 'No images found.'; return; }
      status.textContent = 'Opening ' + images.length + ' images in new tabs...';
      images.forEach(u => { try { window.open(u, '_blank'); } catch(e){} });
    });
  })();
</script>`;
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.create({ url: 'data:text/html;charset=utf-8,' + encodeURIComponent(listing) });
        } else {
          console.log('Listing (fallback):', listing);
        }
      } catch (e) {
        console.error('background: fallback open failed', e);
      }
    })();
  }).catch((err) => {
    recordError(err);
    const errPage = '<!doctype html><meta charset="utf-8"><title>Error</title><pre>' + String(err) + '</pre>';
    try { chrome.tabs.create({ url: 'data:text/html;charset=utf-8,' + encodeURIComponent(errPage) }); } catch(e){}
  });
});
