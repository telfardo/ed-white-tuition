/* Ed White Tuition — the editor.
   Loads on every page but does nothing at all unless Ed has signed in on
   /admin.html. Edits are held in this browser until he presses Publish,
   which writes them to Supabase and makes them live for everyone. */

/* content.js announces itself when it has applied any saved overrides. Wait
   for that rather than relying on script order, which is easy to get wrong. */
if (window.EDW && window.EDW.auth && window.EDW.auth.session()) {
  if (window.EDW.ready) {
    startEditor();
  } else {
    document.addEventListener('edw:ready', startEditor, { once: true });
  }
} else if (!window.EDW) {
  document.addEventListener('edw:ready', function () {
    if (window.EDW.auth.session()) startEditor();
  }, { once: true });
}

function startEditor() {
  'use strict';

  if (!document.querySelector('main')) return;
  if (document.querySelector('.edw-bar')) return;

  var EDW = window.EDW;
  var draft = EDW.draft() || EDW.blank();
  var mode = null;

  function save() {
    localStorage.setItem(EDW.DRAFT_KEY, JSON.stringify(draft));
    markDirty();
  }

  /* ---------- toolbar ---------- */

  var bar = document.createElement('div');
  bar.className = 'edw-bar';
  bar.innerHTML =
    '<span class="edw-brand">Editing</span>' +
    '<button data-mode="text">Text</button>' +
    '<button data-mode="layout">Photos</button>' +
    '<button data-mode="sections">Sections</button>' +
    '<span class="edw-sep"></span>' +
    '<span class="edw-status" id="edw-status">Nothing to publish</span>' +
    '<button class="edw-go" id="edw-publish">Publish</button>' +
    '<button id="edw-reset">Undo all</button>' +
    '<button id="edw-exit">Done</button>';
  document.body.appendChild(bar);
  document.body.classList.add('edw-editing');

  var status = bar.querySelector('#edw-status');

  function countChanges() {
    return Object.keys(draft).reduce(function (n, part) {
      return n + Object.keys(draft[part] || {}).length;
    }, 0);
  }

  function markDirty() {
    var n = countChanges();
    status.textContent = n ? n + ' change' + (n === 1 ? '' : 's') + ' not published yet' : 'Nothing to publish';
    status.classList.toggle('is-dirty', !!n);
  }
  markDirty();

  /* ---------- text editing ---------- */

  function setTextMode(on) {
    Array.prototype.forEach.call(EDW.textNodes(), function (el) {
      if (on) {
        el.setAttribute('contenteditable', 'true');
        el.classList.add('edw-editable');
        if (!el.dataset.edwBound) {
          el.dataset.edwBound = '1';
          el.addEventListener('blur', function () {
            draft.text[EDW.keyFor(el)] = el.innerHTML.trim();
            save();
          });
          el.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') el.blur();
          });
        }
      } else {
        el.removeAttribute('contenteditable');
        el.classList.remove('edw-editable');
      }
    });
  }

  /* ---------- photo size, crop & replace ---------- */

  var panel = null;

  function closePanel() {
    if (panel) { panel.remove(); panel = null; }
    Array.prototype.forEach.call(EDW.layoutNodes(), function (el) {
      el.classList.remove('edw-selected');
    });
  }

  function openPanel(slot) {
    closePanel();
    slot.classList.add('edw-selected');

    var key = EDW.keyFor(slot);
    var live = EDW.current();
    var box = draft.layout[key] || live.layout[key] || {};
    var img = slot.querySelector('img');
    var imgKey = img ? EDW.keyFor(img) : null;

    // Start the sliders from whatever the photo is actually showing.
    var pos = (box.position || getComputedStyle(img).objectPosition || '50% 50%').split(/\s+/);
    var px = parseFloat(pos[0]) || 50;
    var py = parseFloat(pos[1]) || 50;
    var width = parseFloat(box.width) || Math.round(slot.getBoundingClientRect().width);

    panel = document.createElement('div');
    panel.className = 'edw-panel';
    panel.innerHTML =
      '<h4>Photo</h4>' +
      '<label class="edw-file">Replace this photo' +
      '<input type="file" id="edw-upload" accept="image/jpeg,image/png,image/webp,image/avif"></label>' +
      '<p class="edw-upload-note" id="edw-upload-note" hidden></p>' +
      '<label>Size <output id="p-w">' + width + 'px</output>' +
      '<input type="range" id="edw-width" min="80" max="900" value="' + width + '"></label>' +
      '<label>Move across <output id="p-x">' + Math.round(px) + '%</output>' +
      '<input type="range" id="edw-x" min="0" max="100" value="' + px + '"></label>' +
      '<label>Move up / down <output id="p-y">' + Math.round(py) + '%</output>' +
      '<input type="range" id="edw-y" min="0" max="100" value="' + py + '"></label>' +
      '<label>Shape' +
      '<select id="edw-ratio">' +
      '<option value="">Leave as is</option>' +
      '<option value="1">Square</option>' +
      '<option value="4 / 5">Portrait</option>' +
      '<option value="3 / 4">Tall</option>' +
      '<option value="4 / 3">Landscape</option>' +
      '<option value="3 / 2">Wide</option>' +
      '</select></label>' +
      '<div class="edw-panel-actions">' +
      '<button id="edw-clear">Reset this photo</button>' +
      '<button id="edw-close" class="edw-go">Close</button>' +
      '</div>';
    document.body.appendChild(panel);

    if (box.ratio) panel.querySelector('#edw-ratio').value = box.ratio;

    function write(next) {
      draft.layout[key] = Object.assign({}, draft.layout[key], next);
      save();
    }

    var note = panel.querySelector('#edw-upload-note');

    panel.querySelector('#edw-upload').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file || !imgKey) return;

      note.hidden = false;
      note.textContent = 'Uploading ' + file.name + '…';

      EDW.storage.upload(file).then(function (url) {
        draft.images[imgKey] = url;
        img.src = url;
        slot.classList.remove('is-empty');
        save();
        note.textContent = 'Uploaded. Press Publish to put it live.';
      }).catch(function (err) {
        note.textContent = 'Upload failed: ' + err.message;
      });
    });

    panel.querySelector('#edw-width').addEventListener('input', function () {
      slot.style.width = this.value + 'px';
      slot.style.maxWidth = '100%';
      panel.querySelector('#p-w').textContent = this.value + 'px';
      write({ width: this.value + 'px' });
    });

    function movePhoto() {
      var x = panel.querySelector('#edw-x').value;
      var y = panel.querySelector('#edw-y').value;
      img.style.objectPosition = x + '% ' + y + '%';
      panel.querySelector('#p-x').textContent = x + '%';
      panel.querySelector('#p-y').textContent = y + '%';
      write({ position: x + '% ' + y + '%' });
    }
    panel.querySelector('#edw-x').addEventListener('input', movePhoto);
    panel.querySelector('#edw-y').addEventListener('input', movePhoto);

    panel.querySelector('#edw-ratio').addEventListener('change', function () {
      slot.style.aspectRatio = this.value;
      write({ ratio: this.value });
    });

    panel.querySelector('#edw-clear').addEventListener('click', function () {
      delete draft.layout[key];
      if (imgKey) delete draft.images[imgKey];
      slot.style.width = '';
      slot.style.aspectRatio = '';
      img.style.objectPosition = '';
      save();
      closePanel();
    });

    panel.querySelector('#edw-close').addEventListener('click', closePanel);
  }

  function setLayoutMode(on) {
    Array.prototype.forEach.call(EDW.layoutNodes(), function (el) {
      el.classList.toggle('edw-pickable', on);
      if (on && !el.dataset.edwBound) {
        el.dataset.edwBound = '1';
        el.addEventListener('click', function (e) {
          if (!document.body.classList.contains('edw-mode-layout')) return;
          e.preventDefault();
          openPanel(el);
        });
      }
    });
    if (!on) closePanel();
  }

  /* ---------- section order, visibility & deletion ---------- */

  function pageName() {
    return (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '');
  }

  function recordOrder() {
    var ids = [];
    Array.prototype.forEach.call(EDW.sections(), function (s) {
      if (s.id) ids.push(s.id);
    });
    draft.order[pageName()] = ids;
    save();
  }

  function setSectionMode(on) {
    Array.prototype.forEach.call(EDW.sections(), function (section) {
      var existing = section.querySelector(':scope > .edw-section-tools');
      if (!on) {
        if (existing) existing.remove();
        section.classList.remove('edw-outlined');
        return;
      }
      section.classList.add('edw-outlined');
      if (existing) return;

      // Sections need an id to be reorderable; give the nameless ones one.
      if (!section.id) {
        section.id = 'sec-' + Array.prototype.indexOf.call(EDW.sections(), section);
      }

      var tools = document.createElement('div');
      tools.className = 'edw-section-tools';
      tools.innerHTML =
        '<button title="Move up">↑</button>' +
        '<button title="Move down">↓</button>' +
        '<button title="Hide or show">' + (section.hasAttribute('hidden') ? 'Show' : 'Hide') + '</button>' +
        '<button title="Delete for good" class="edw-danger">Delete</button>';
      section.prepend(tools);

      var buttons = tools.querySelectorAll('button');

      buttons[0].addEventListener('click', function () {
        var prev = section.previousElementSibling;
        if (prev && prev.tagName === 'SECTION') { section.parentNode.insertBefore(section, prev); recordOrder(); }
      });

      buttons[1].addEventListener('click', function () {
        var next = section.nextElementSibling;
        if (next && next.tagName === 'SECTION') { section.parentNode.insertBefore(next, section); recordOrder(); }
      });

      buttons[2].addEventListener('click', function () {
        var key = EDW.keyFor(section);
        if (section.hasAttribute('hidden')) {
          section.removeAttribute('hidden');
          delete draft.hidden[key];
          this.textContent = 'Hide';
        } else {
          section.setAttribute('hidden', '');
          draft.hidden[key] = true;
          this.textContent = 'Show';
        }
        save();
      });

      buttons[3].addEventListener('click', function () {
        if (!confirm('Delete this whole section?\n\nIt disappears from the page for everyone once you publish. "Undo all" brings it back until then.')) return;
        draft.deleted[EDW.keyFor(section)] = true;
        section.style.display = 'none';
        save();
      });
    });
  }

  /* Hidden sections still need to be reachable in the editor. */
  var showHidden = document.createElement('style');
  showHidden.textContent = '.edw-mode-sections main > section[hidden]{display:block;opacity:.45}';
  document.head.appendChild(showHidden);

  /* ---------- mode switching ---------- */

  function setMode(next) {
    mode = (mode === next) ? null : next;

    setTextMode(mode === 'text');
    setLayoutMode(mode === 'layout');
    setSectionMode(mode === 'sections');

    document.body.classList.toggle('edw-mode-text', mode === 'text');
    document.body.classList.toggle('edw-mode-layout', mode === 'layout');
    document.body.classList.toggle('edw-mode-sections', mode === 'sections');

    Array.prototype.forEach.call(bar.querySelectorAll('[data-mode]'), function (b) {
      b.classList.toggle('is-on', b.dataset.mode === mode);
    });
  }

  Array.prototype.forEach.call(bar.querySelectorAll('[data-mode]'), function (b) {
    b.addEventListener('click', function () { setMode(b.dataset.mode); });
  });

  /* ---------- publish ---------- */

  bar.querySelector('#edw-publish').addEventListener('click', function () {
    var button = this;
    if (!countChanges()) return;

    button.disabled = true;
    status.textContent = 'Publishing…';

    /* Re-read what is live first, so publishing from one device does not
       quietly wipe an edit made on another. */
    EDW.remote.load().then(function (live) {
      var merged = EDW.blank();
      Object.keys(merged).forEach(function (part) {
        merged[part] = Object.assign({}, (live || {})[part], draft[part]);
      });
      return EDW.remote.save(merged);
    }).then(function () {
      localStorage.removeItem(EDW.DRAFT_KEY);
      draft = EDW.blank();
      button.disabled = false;
      markDirty();
      status.textContent = 'Published — live for everyone';
      status.classList.remove('is-dirty');
    }).catch(function (err) {
      button.disabled = false;
      status.textContent = 'Could not publish: ' + err.message;
      status.classList.add('is-dirty');
    });
  });

  bar.querySelector('#edw-reset').addEventListener('click', function () {
    if (!confirm('Throw away every change you have not published yet?')) return;
    localStorage.removeItem(EDW.DRAFT_KEY);
    location.reload();
  });

  bar.querySelector('#edw-exit').addEventListener('click', function () {
    if (countChanges() && !confirm('You have changes that are not published yet. Leave the editor anyway?')) return;
    EDW.auth.signOut();
    location.reload();
  });
}
