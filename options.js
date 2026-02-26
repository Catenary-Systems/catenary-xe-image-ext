document.addEventListener('DOMContentLoaded', async () => {
  const input = document.getElementById('downloadFolder');
  const classinput = document.getElementById('extractedClass');
  const imageinput = document.getElementById('extractedImages');
  const save = document.getElementById('save');
  const msg = document.getElementById('msg');

  const defaults = {
    downloadFolder: '',
    extractedClass: '.grid-x.image-grid-wrapper',
    imageClass: '.cell.small-6.image-item'
  };

  let cfg = { ...defaults };
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      cfg = await chrome.storage.sync.get(defaults);
    } else {
      const raw = window.localStorage.getItem('xe_options');
      if (raw) cfg = { ...defaults, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('options: storage read failed', e);
  }
  input.value = cfg.downloadFolder || '';
  classinput.value = cfg.extractedClass || '';
  imageinput.value = cfg.imageClass || '';

  save.addEventListener('click', async () => {
    const newValues = {
      downloadFolder: input.value.trim(),
      extractedClass: classinput.value.trim(),
      imageClass: imageinput.value.trim()
    };
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        await chrome.storage.sync.set(newValues);
      } else {
        window.localStorage.setItem('xe_options', JSON.stringify(newValues));
      }
      msg.textContent = 'Saved';
      setTimeout(() => msg.textContent = '', 2000);
    } catch (e) {
      console.warn('options: storage save failed', e);
      msg.textContent = 'Save failed';
    }
  });
});
