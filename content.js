/* Ed White Tuition — saved content.
   ------------------------------------------------------------------
   Ed's edits live in Supabase and are live for everyone the moment he
   presses Publish. Nothing needs committing by hand any more.

   EDW_SAVED below is a baked-in fallback, not the source of truth. It is
   applied instantly on load so the page never flashes, then the live
   content arrives from Supabase and replaces it. If Supabase is ever
   unreachable the site simply falls back to this, and to the original
   wording in the HTML underneath it.
   ------------------------------------------------------------------ */

window.EDW_SAVED = {
  text: {},
  layout: {},
  hidden: {},
  order: {},
  images: {},
  deleted: {},
  added: {}
};

(function () {
  'use strict';

  var SUPABASE_URL = 'https://mmcghrsbugsakxhpehvg.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_TtxW2qPFzLRBIENM2lcjDg_jNZpWDar';

  var DRAFT_KEY = 'edw-draft-v1';   // unpublished edits, this browser only
  var CACHE_KEY = 'edw-cache-v1';   // last known live content, for instant paint
  var TOKEN_KEY = 'edw-session-v1'; // Ed's Supabase session

  var EMPTY = { text: {}, layout: {}, hidden: {}, order: {}, images: {}, deleted: {}, added: {} };

  function blank() { return JSON.parse(JSON.stringify(EMPTY)); }

  /* What each element looked like before any override touched it. */
  var originals = new WeakMap();

  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }

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

  function pageName() {
    return (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '');
  }

  /* ---- talking to Supabase ----
     Plain fetch rather than the JS SDK: this file loads on every page view,
     and the SDK is well over a hundred kilobytes to do four requests. */

  /* Supabase access tokens last about an hour. Without this, an editor left
     open over lunch starts failing every save with an error that looks like a
     permissions problem but isn't. */
  function refresh() {
    var session = readJSON(TOKEN_KEY);
    if (!session || !session.refresh_token) return Promise.resolve(null);

    return fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (body) {
        if (body && body.access_token) localStorage.setItem(TOKEN_KEY, JSON.stringify(body));
        return body;
      })
      .catch(function () { return null; });
  }

  function rest(path, options, retried) {
    options = options || {};
    var headers = {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json'
    };
    var session = readJSON(TOKEN_KEY);
    headers.Authorization = 'Bearer ' + ((session && session.access_token) || SUPABASE_KEY);
    Object.keys(options.headers || {}).forEach(function (h) { headers[h] = options.headers[h]; });

    return fetch(SUPABASE_URL + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body
    }).then(function (r) {
      if (r.status !== 401 || retried || !session) return r;
      return refresh().then(function (ok) {
        return ok ? rest(path, options, true) : r;
      });
    });
  }

  var remote = {
    load: function () {
      return rest('/rest/v1/site_content?id=eq.live&select=data')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (rows) { return (rows && rows[0] && rows[0].data) || null; })
        .catch(function () { return null; });
    },

    save: function (data) {
      /* return=representation matters: a write blocked by row-level security
         still comes back 204, so asking for the updated row is the only way
         to tell "saved" apart from "silently refused". */
      return rest('/rest/v1/site_content?id=eq.live', {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ data: data })
      }).then(function (r) {
        if (r.status === 401) throw new Error('your sign-in has expired — sign out and back in');
        if (!r.ok) {
          return r.text().then(function (t) { throw new Error(t || ('HTTP ' + r.status)); });
        }
        return r.json();
      }).then(function (rows) {
        /* An update blocked by row-level security still comes back 200, just
           with nothing in it. That means the account is signed in but is not
           on the editors list - a different problem from an expired session,
           and nothing the person at the keyboard can fix. */
        if (!rows || !rows.length) {
          throw new Error('this account is not allowed to edit the site');
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        return true;
      });
    }
  };

  var auth = {
    session: function () { return readJSON(TOKEN_KEY); },

    signIn: function (email, password) {
      return fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
      }).then(function (r) {
        return r.json().then(function (body) {
          if (!r.ok) throw new Error(body.error_description || body.msg || 'Sign-in failed');
          localStorage.setItem(TOKEN_KEY, JSON.stringify(body));
          return body;
        });
      });
    },

    signInWithGoogle: function () {
      location.href = SUPABASE_URL + '/auth/v1/authorize?provider=google&redirect_to=' +
        encodeURIComponent(location.origin + location.pathname);
    },

    /* Coming back from Google, the tokens arrive in the URL fragment rather
       than a response body. Same shape as the password grant, so everything
       downstream is unchanged. The fragment is wiped afterwards so the token
       isn't left sitting in the address bar or in history. */
    collectRedirect: function () {
      if (!location.hash || location.hash.indexOf('access_token=') === -1) return false;

      var parts = new URLSearchParams(location.hash.slice(1));
      var session = {
        access_token: parts.get('access_token'),
        refresh_token: parts.get('refresh_token'),
        expires_in: Number(parts.get('expires_in')) || 3600,
        token_type: parts.get('token_type') || 'bearer'
      };
      if (!session.access_token) return false;

      localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
      history.replaceState(null, '', location.pathname + location.search);
      return true;
    },

    signOut: function () { localStorage.removeItem(TOKEN_KEY); }
  };

  var storage = {
    upload: function (file) {
      var session = auth.session();
      if (!session) return Promise.reject(new Error('Not signed in'));

      var safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
      var path = Date.now() + '-' + safe;

      return fetch(SUPABASE_URL + '/storage/v1/object/site-images/' + path, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: 'Bearer ' + session.access_token,
          'Content-Type': file.type
        },
        body: file
      }).then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error(t || 'Upload failed'); });
        return SUPABASE_URL + '/storage/v1/object/public/site-images/' + path;
      });
    }
  };

  /* ---- applying overrides ---- */

  window.EDW = {
    DRAFT_KEY: DRAFT_KEY,
    CACHE_KEY: CACHE_KEY,
    keyFor: keyFor,
    remote: remote,
    auth: auth,
    storage: storage,
    blank: blank,

    textNodes: function () {
      return document.querySelectorAll(
        'main h1, main h2, main h3, main p, main li, main figcaption, main .eyebrow, main .pick-cue, main .age'
      );
    },

    layoutNodes: function () { return document.querySelectorAll('.photo'); },
    imageNodes: function () { return document.querySelectorAll('.photo img'); },
    sections: function () { return document.querySelectorAll('main > section'); },

    draft: function () { return readJSON(DRAFT_KEY); },
    cache: function () { return readJSON(CACHE_KEY); },

    /* Live content first, then this browser's unpublished draft on top. */
    current: function () {
      var live = this.cache() || window.EDW_SAVED || {};
      var draft = this.draft() || {};
      var out = blank();
      Object.keys(out).forEach(function (part) {
        out[part] = Object.assign({}, live[part], draft[part]);
      });
      return out;
    },

    apply: function () {
      var data = this.current();

      /* Clear anything added last time round, so re-applying newer content
         doesn't stack duplicates up. They go back on at the end. */
      Array.prototype.forEach.call(document.querySelectorAll('[data-edw-added]'), function (el) {
        el.remove();
      });

      /* Remember the original before overwriting it, so that content
         arriving later can put things back rather than only ever piling
         one override on top of another.

         Held in a WeakMap rather than on the element. Stored as a data-
         attribute it became part of the element's own markup, so capturing
         a parent's innerHTML swept the attribute up with it and wrote the
         bookkeeping into the saved content. */
      function original(el, prop) {
        var seen = originals.get(el) || {};
        if (seen[prop] === undefined) {
          seen[prop] = el[prop] || '';
          originals.set(el, seen);
        }
        return seen[prop];
      }

      Array.prototype.forEach.call(this.textNodes(), function (el) {
        var value = data.text[keyFor(el)];
        var was = original(el, 'innerHTML');
        el.innerHTML = (typeof value === 'string') ? value : was;
      });

      Array.prototype.forEach.call(this.imageNodes(), function (img) {
        var value = data.images[keyFor(img)];
        var was = original(img, 'src');
        if (value) { img.src = value; img.parentNode.classList.remove('is-empty'); }
        else if (img.src !== was) { img.src = was; }
      });

      Array.prototype.forEach.call(this.layoutNodes(), function (el) {
        var box = data.layout[keyFor(el)] || {};
        var img = el.querySelector('img');
        el.style.width = box.width || '';
        el.style.aspectRatio = box.ratio || '';
        if (img) img.style.objectPosition = box.position || '';
      });

      Array.prototype.forEach.call(this.sections(), function (el) {
        if (data.hidden[keyFor(el)]) el.setAttribute('hidden', '');
        else el.removeAttribute('hidden');
      });

      /* Deleted things are hidden, not removed. Text keys are built from an
         element's position among its same-tag siblings, so taking one out of
         the document would shift every later sibling's key by one and rebind
         their saved text to the wrong element. Leaving it in place with
         display:none looks identical - no gap, nothing left for a screen
         reader - and keeps every other key pointing where it should. */
      var gone = [].concat(
        Array.prototype.slice.call(this.sections()),
        Array.prototype.slice.call(this.textNodes())
      );
      gone.forEach(function (el) {
        if (data.deleted[keyFor(el)]) el.style.display = 'none';
        else if (el.style.display === 'none') el.style.display = '';
      });

      /* Blocks Ed has added. They are appended after everything that was
         already there, which is what keeps the positional keys of the
         original elements pointing where they always did. Each carries its
         own id, so editing one never depends on where it sits. */
      Array.prototype.forEach.call(this.sections(), function (section) {
        var list = data.added[keyFor(section)] || [];
        var host = section.querySelector('.wrap') || section;
        list.forEach(function (item) {
          var el = document.createElement(item.tag || 'p');
          el.setAttribute('data-edw-added', item.id);
          el.innerHTML = item.html || '';
          host.appendChild(el);
        });
      });

      var main = document.querySelector('main');
      if (main) {
        var wanted = data.order[pageName()];
        if (wanted && wanted.length) {
          wanted.forEach(function (id) {
            var section = main.querySelector('section#' + CSS.escape(id));
            if (section) main.appendChild(section);
          });
        }
      }
    }
  };

  function start() {
    /* Paint from the cache immediately - no waiting on the network. */
    if (!window.EDW.cache() && window.EDW_SAVED) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(window.EDW_SAVED));
    }
    window.EDW.apply();
    window.EDW.ready = true;
    document.dispatchEvent(new CustomEvent('edw:ready'));

    /* Then check what's actually live and update if it has moved on. */
    remote.load().then(function (live) {
      if (!live) return;
      var before = localStorage.getItem(CACHE_KEY);
      var after = JSON.stringify(Object.assign(blank(), live));
      if (before === after) return;

      localStorage.setItem(CACHE_KEY, after);

      /* Every override is reversible now that nothing is removed from the
         document, so newer content can simply be re-applied over the top. */
      window.EDW.apply();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
