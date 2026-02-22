document.addEventListener('DOMContentLoaded', async () => {
  const input = document.getElementById('downloadFolder');
  const save = document.getElementById('save');
  const msg = document.getElementById('msg');
  let cfg = { downloadFolder: '' };
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      cfg = await chrome.storage.sync.get({ downloadFolder: '' });
    } else {
      const raw = window.localStorage.getItem('xe_options');
      if (raw) cfg = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('options: storage read failed', e);
  }
  input.value = cfg.downloadFolder || '';
  save.addEventListener('click', async () => {
    const val = input.value.trim();
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        await chrome.storage.sync.set({ downloadFolder: val });
      } else {
        window.localStorage.setItem('xe_options', JSON.stringify({ downloadFolder: val }));
      }
      msg.textContent = 'Saved';
      setTimeout(() => msg.textContent = '', 2000);
    } catch (e) {
      console.warn('options: storage save failed', e);
      msg.textContent = 'Save failed';
    }
  });
});
