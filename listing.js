document.addEventListener('DOMContentLoaded', async () => {
  const status = document.getElementById('status');
  const content = document.getElementById('content');
  const openBtn = document.getElementById('openBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const viewLogsBtn = document.getElementById('viewLogs');

  async function storageGet(key) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && typeof chrome.storage.local.get === 'function') {
        return await chrome.storage.local.get(key);
      }
    } catch (e) {
      console.warn('storageGet: chrome.storage access failed', e);
    }
    // fallback to window.localStorage for non-extension contexts
    try {
      const raw = window.localStorage.getItem(key);
      return { [key]: raw ? JSON.parse(raw) : undefined };
    } catch (e) {
      return { [key]: undefined };
    }
  }

  // try to obtain extract via runtime message (background stores it in-memory by id)
  let extract = { html: '', images: [] };
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (id && typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
    try {
      const resp = await new Promise(resolve => chrome.runtime.sendMessage({ type: 'getExtract', id }, resolve));
      if (resp && resp.ok && resp.data) extract = resp.data;
    } catch (e) {
      console.warn('listing: runtime getExtract failed', e);
    }
  }
  if (!extract || (!extract.html && (!extract.images || !extract.images.length))) {
    const data = await storageGet('lastExtract');
    extract = (data && data.lastExtract) || { html: '', images: [] };
  }
  if (!extract.html && !extract.images.length) {
    status.textContent = 'No extracted content available. Make sure you opened the extension via the toolbar icon.';
  }
  content.innerHTML = extract.html || '<p>No extracted content.</p>';

  openBtn.addEventListener('click', () => {
    try {
      const urlBase = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL('opened.html') : null;
      if (urlBase) {
        const url = urlBase + (id ? ('?id=' + encodeURIComponent(id)) : '');
        window.open(url, '_blank');
      } else {
        const html = '<!doctype html><meta charset="utf-8"><title>Opened XE Modal</title>' + (extract.html || '');
        const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
        window.open(dataUrl, '_blank');
      }
    } catch (e) {
      console.warn('openBtn: failed to open opened.html', e);
    }
  });

  downloadBtn.addEventListener('click', async () => {
    const imgs = extract.images || [];
    if (!imgs.length) { status.textContent = 'No images found.'; return; }
    status.textContent = `Found ${imgs.length} images, initiating...`;
    let cfg = { downloadFolder: '' };
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync && typeof chrome.storage.sync.get === 'function') {
        cfg = await chrome.storage.sync.get({ downloadFolder: '' });
      } else {
        const raw = window.localStorage.getItem('options') || window.localStorage.getItem('xe_options');
        if (raw) cfg = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('download: read options failed', e);
    }
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
        console.warn('listing: downloadImages request failed', e);
        status.textContent = 'Download failed to start.';
      }
    } else {
      // fallback: open images in new tabs for manual save
      for (const u of imgs) { try { window.open(u, '_blank'); } catch(e){} }
      status.textContent = 'Opened images in new tabs for manual download.';
    }
  });

  viewLogsBtn && viewLogsBtn.addEventListener('click', async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
        const resp = await new Promise(resolve => chrome.runtime.sendMessage({ type: 'getLastErrorLog' }, resolve));
        if (resp && resp.ok && resp.lastErrorLog) {
          const l = resp.lastErrorLog;
          alert('Last error:\n' + l.time + '\n' + l.message + '\n' + (l.stack||''));
        } else {
          alert('No error log available.');
        }
      } else {
        alert('No runtime available to fetch logs.');
      }
    } catch (e) {
      alert('Failed to retrieve logs: ' + e);
    }
  });
});
