/* Ed White Tuition
   - Builds a WhatsApp message from the booking form and shows it for review
     before anything is sent.
   - Marks photo slots as empty when the image file isn't there yet, so the
     layout stays intact instead of showing a broken image. */

(function () {
  'use strict';

  var WHATSAPP_NUMBER = '447710241930';

  /* ---- photo placeholders ---- */

  Array.prototype.forEach.call(document.querySelectorAll('.photo img'), function (img) {
    function markEmpty() {
      var slot = img.closest('.photo');
      if (slot) slot.classList.add('is-empty');
    }
    img.addEventListener('error', markEmpty);
    // Covers images that already failed before this script ran.
    if (img.complete && img.naturalWidth === 0) markEmpty();
  });

  /* ---- booking form ---- */

  var form = document.getElementById('booking-form');
  if (!form) return;

  /* Subject cards tick the matching box on the form and jump to it. */
  Array.prototype.forEach.call(document.querySelectorAll('.card-pick'), function (card) {
    card.addEventListener('click', function () {
      var box = document.getElementById(card.getAttribute('data-subject'));
      if (box) box.checked = true;

      document.getElementById('book').scrollIntoView({ behavior: 'smooth', block: 'start' });

      var nameField = document.getElementById('name');
      if (nameField && !nameField.value.trim()) {
        // Wait for the smooth scroll before stealing focus, or the browser jumps.
        setTimeout(function () { nameField.focus({ preventScroll: true }); }, 600);
      }
    });
  });

  var preview = document.getElementById('preview');
  var previewText = document.getElementById('preview-text');
  var whatsappLink = document.getElementById('send-whatsapp');
  var copyButton = document.getElementById('copy-message');

  function value(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function checkedSubjects() {
    return Array.prototype.slice
      .call(document.querySelectorAll('#subjects input:checked'))
      .map(function (input) { return input.value; });
  }

  function buildMessage() {
    var name = value('name');
    var student = value('student');
    var subjects = checkedSubjects();
    var lines = [];

    lines.push('Hi Ed — I’d like to book a lesson.');
    lines.push('');
    lines.push('Name: ' + (name || '(not given)'));

    if (student && student.toLowerCase() !== 'me') {
      lines.push('Lessons for: ' + student);
    }

    lines.push('Subject: ' + (subjects.length ? subjects.join(', ') : '(not chosen yet)'));
    lines.push('Level: ' + value('level'));
    lines.push('Lesson length: ' + value('length'));

    var where = document.querySelector('input[name="where"]:checked');
    lines.push('Where: ' + (where ? where.value : 'Not specified'));

    if (value('when')) lines.push('Best times: ' + value('when'));
    if (value('notes')) {
      lines.push('');
      lines.push(value('notes'));
    }

    lines.push('');
    lines.push('Thanks!');

    return lines.join('\n');
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var nameField = document.getElementById('name');
    if (!nameField.value.trim()) {
      nameField.focus();
      nameField.setAttribute('aria-invalid', 'true');
      return;
    }
    nameField.removeAttribute('aria-invalid');

    var message = buildMessage();

    previewText.textContent = message;
    whatsappLink.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
    preview.hidden = false;
    copyButton.textContent = 'Copy message';

    preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  copyButton.addEventListener('click', function () {
    var message = previewText.textContent;

    function done() {
      copyButton.textContent = 'Copied';
      setTimeout(function () { copyButton.textContent = 'Copy message'; }, 2000);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(message).then(done, fallbackCopy);
    } else {
      fallbackCopy();
    }

    function fallbackCopy() {
      var area = document.createElement('textarea');
      area.value = message;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* nothing sensible to do */ }
      document.body.removeChild(area);
    }
  });
})();
