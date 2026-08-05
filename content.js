/* Ed White Tuition — saved content overrides.
   ------------------------------------------------------------------
   THIS FILE IS WRITTEN BY THE ADMIN PAGE. Ed edits the site in his
   browser, presses Export, and the downloaded file replaces this one.
   Commit it and the edits go live for everyone.

   Until then his changes live only in his own browser's storage.
   ------------------------------------------------------------------ */

window.EDW_SAVED = {
  text: {},
  layout: {},
  hidden: {},
  order: {}
};

/* ---- applying overrides ---- */

(function () {
  'use strict';

  var DRAFT_KEY = 'edw-draft-v1';

  /* A key that survives copy edits: page name, the id of the section the
     element sits in, its tag, and its position among same-tag siblings in
     that section. */
  function keyFor(el) {
    var page = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '');
    var section = el.closest('section, header, footer');
    var scope = section ? (section.id || section.tagName.toLowerCase()) : 'body';
    var tag = el.tagName.toLowerCase();

    var siblings = (section || document.body).querySelectorAll(tag);
    var index = Array.prototype.indexOf.call(siblings, el);

    return page + '|' + scope + '|' + tag + '|' + index;
  }

  window.EDW = {
    DRAFT_KEY: DRAFT_KEY,
    keyFor: keyFor,

    /* Everything that can be retyped. */
    textNodes: function () {
      return document.querySelectorAll(
        'main h1, main h2, main h3, main p, main li, main figcaption, main .eyebrow, main .pick-cue, main .age'
      );
    },

    /* Everything that can be resized or re-cropped. */
    layoutNodes: function () {
      return document.querySelectorAll('.photo');
    },

    sections: function () {
      return document.querySelectorAll('main > section');
    },

    draft: function () {
      try {
        return JSON.parse(localStorage.getItem(DRAFT_KEY)) || null;
      } catch (e) {
        return null;
      }
    },

    /* Saved file first, then the browser draft on top of it. */
    current: function () {
      var saved = window.EDW_SAVED || {};
      var draft = this.draft() || {};
      return {
        text: Object.assign({}, saved.text, draft.text),
        layout: Object.assign({}, saved.layout, draft.layout),
        hidden: Object.assign({}, saved.hidden, draft.hidden),
        order: Object.assign({}, saved.order, draft.order)
      };
    },

    apply: function () {
      var data = this.current();

      Array.prototype.forEach.call(this.textNodes(), function (el) {
        var value = data.text[keyFor(el)];
        if (typeof value === 'string') el.innerHTML = value;
      });

      Array.prototype.forEach.call(this.layoutNodes(), function (el) {
        var box = data.layout[keyFor(el)];
        if (!box) return;
        if (box.width) el.style.width = box.width;
        if (box.ratio) el.style.aspectRatio = box.ratio;
        if (box.position) {
          var img = el.querySelector('img');
          if (img) img.style.objectPosition = box.position;
        }
      });

      Array.prototype.forEach.call(this.sections(), function (el) {
        if (data.hidden[keyFor(el)]) el.setAttribute('hidden', '');
      });

      var main = document.querySelector('main');
      if (!main) return;
      var page = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '');
      var wanted = data.order[page];
      if (!wanted || !wanted.length) return;

      wanted.forEach(function (id) {
        var section = main.querySelector('section#' + CSS.escape(id));
        if (section) main.appendChild(section);
      });
    }
  };

  function start() {
    window.EDW.apply();
    window.EDW.ready = true;
    document.dispatchEvent(new CustomEvent('edw:ready'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
