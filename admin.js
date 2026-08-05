/* Ed White Tuition — the editor.
   Loads on every page but does nothing at all unless you've signed in on
   /admin.html. Edits are kept in this browser until you press Export. */

var SESSION_KEY = 'edw-admin-on';

/* content.js announces itself when it has applied any saved overrides. Wait
   for that rather than relying on script order, which is easy to get wrong. */
if (localStorage.getItem(SESSION_KEY) === 'yes') {
  if (window.EDW && window.EDW.ready) {
    startEditor();
  } else {
    document.addEventListener('edw:ready', startEditor, { once: true });
  }
}

function startEditor() {
  'use strict';

  if (!document.querySelector('main')) return;
  if (document.querySelector('.edw-bar')) return;

  var EDW = window.EDW;
  var draft = EDW.draft() || { text: {}, layout: {}, hidden: {}, order: {} };
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
    '<span class="edw-status" id="edw-status">No unsaved changes</span>' +
    '<button class="edw-go" id="edw-export">Export</button>' +
    '<button id="edw-reset">Undo all</button>' +
    '<button id="edw-exit">Done</button>';
  document.body.appendChild(bar);
  document.body.classList.add('edw-editing');

  var status = bar.querySelector('#edw-status');

  function markDirty() {
    var n = Object.keys(draft.text).length +
            Object.keys(draft.layout).length +
            Object.keys(draft.hidden).length +
            Object.keys(draft.order).length;
    status.textContent = n ? n + ' change' + (n === 1 ? '' : 's') + ' not yet exported' : 'No unsaved changes';
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

  /* ---------- photo size & crop ---------- */

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
    var box = draft.layout[key] || (window.EDW_SAVED.layout || {})[key] || {};
    var img = slot.querySelector('img');

    // Start the sliders from whatever the photo is actually showing.
    var pos = (box.position || getComputedStyle(img).objectPosition || '50% 50%').split(/\s+/);
    var px = parseFloat(pos[0]) || 50;
    var py = parseFloat(pos[1]) || 50;
    var width = parseFloat(box.width) || Math.round(slot.getBoundingClientRect().width);

    panel = document.createElement('div');
    panel.className = 'edw-panel';
    panel.innerHTML =
      '<h4>Photo</h4>' +
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

  /* ---------- section order & visibility ---------- */

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
        '<button title="Hide or show">' + (section.hasAttribute('hidden') ? 'Show' : 'Hide') + '</button>';
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

  /* ---------- export ---------- */

  bar.querySelector('#edw-export').addEventListener('click', function () {
    var merged = EDW.current();

    fetch('content.js')
      .then(function (r) { return r.text(); })
      .catch(function () { return null; })
      .then(function (original) {
        var body = 'window.EDW_SAVED = ' + JSON.stringify(merged, null, 2) + ';';
        var out;

        if (original && original.indexOf('window.EDW_SAVED =') !== -1) {
          out = original.replace(/window\.EDW_SAVED = [\s\S]*?\n\};/, body);
        } else {
          out = body;
        }

        var blob = new Blob([out], { type: 'text/javascript' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'content.js';
        document.body.appendChild(a);
        a.click();
        a.remove();

        status.textContent = 'Exported — send content.js to whoever runs the site';
      });
  });

  bar.querySelector('#edw-reset').addEventListener('click', function () {
    if (!confirm('Throw away every change you have made in this browser?')) return;
    localStorage.removeItem(EDW.DRAFT_KEY);
    location.reload();
  });

  bar.querySelector('#edw-exit').addEventListener('click', function () {
    localStorage.removeItem(SESSION_KEY);
    location.reload();
  });
}
