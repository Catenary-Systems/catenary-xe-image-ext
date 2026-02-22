document.addEventListener('DOMContentLoaded', async () => {
  const status = document.getElementById('status');
  const content = document.getElementById('content');
  const downloadAll = document.getElementById('downloadAll');

  let extract = { html: '', images: [] };
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (id && typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
    try {
      const resp = await new Promise(resolve => chrome.runtime.sendMessage({ type: 'getExtract', id }, resolve));
      if (resp && resp.ok && resp.data) extract = resp.data;
    } catch (e) {
      console.warn('opened: runtime getExtract failed', e);
    }
  }
  if (!extract || (!extract.html && (!extract.images || !extract.images.length))) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && typeof chrome.storage.local.get === 'function') {
        const data = await chrome.storage.local.get('lastExtract');
        extract = data.lastExtract || extract;
      } else {
        const raw = window.localStorage.getItem('lastExtract');
        extract = raw ? JSON.parse(raw) : extract;
      }
    } catch (e) {
      console.warn('opened: failed to read extracted data', e);
    }
  }

  content.innerHTML = extract.html || '<p>No extracted content available.</p>';

  function filenameFromUrl(u) {
    try { const p = new URL(u).pathname; const name = p.split('/').filter(Boolean).pop() || 'image'; return name.replace(/[^a-zA-Z0-9._-]/g, '_'); } catch(e) { return 'image'; }
  }

  downloadAll.addEventListener('click', async () => {
    const imgs = extract.images || [];
    if (!imgs.length) { status.textContent = 'No images found.'; return; }
    status.textContent = `Found ${imgs.length} images, starting...`;

    // get configured folder
    let cfg = { downloadFolder: '' };
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync && typeof chrome.storage.sync.get === 'function') {
        cfg = await chrome.storage.sync.get({ downloadFolder: '' });
      } else {
        const raw = window.localStorage.getItem('xe_options');
        if (raw) cfg = JSON.parse(raw);
      }
    } catch (e) { console.warn('opened: read options failed', e); }

    const folder = cfg.downloadFolder || '';
    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
      try {
        const resp = await new Promise(resolve => chrome.runtime.sendMessage({ type: 'downloadImages', images: imgs, folder }, resolve));
        if (resp && resp.ok && Array.isArray(resp.results)) {
          const succeeded = resp.results.filter(r => r.id).length;
          status.textContent = `Triggered ${succeeded} downloads (${resp.results.length} attempts).`;
        } else {
          status.textContent = 'Download request sent.';
        }
      } catch (e) {
        console.warn('opened: downloadImages request failed', e);
        status.textContent = 'Download failed to start.';
      }
    } else {
      // fallback
      const results = [];
      for (const u of imgs) {
        try { window.open(u, '_blank'); results.push({ url: u }); } catch(e) {}
      }
      status.textContent = 'Opened images in new tabs for manual download.';
    }
  });
});
