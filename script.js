/* Ed White Tuition
   - Builds a booking message from the form and shows it for review, then
     offers to send it by email or WhatsApp. Nothing sends on its own.
   - Reveals a different follow-up question depending on whether the lesson is
     online or in person, since Ed moves between England and Bilbao.
   - Marks photo slots as empty when the image file isn't there yet, so the
     layout stays intact instead of showing a broken image. */

(function () {
  'use strict';

  var WHATSAPP_NUMBER = '447710241930';
  var EMAIL_ADDRESS = 'edchriswhite@gmail.com';

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
  var emailLink = document.getElementById('send-email');
  var gmailLink = document.getElementById('send-gmail');
  var copyButton = document.getElementById('copy-message');

  function value(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  /* ---- online vs in person ----
     Ed is in England some of the year and Bilbao the rest, so "where" needs a
     different follow-up each way: a timezone if you're online, a location if
     you want to sit in the same room. */

  var revealOnline = document.getElementById('reveal-online');
  var revealPerson = document.getElementById('reveal-person');
  var timezoneField = document.getElementById('timezone');

  function currentWhere() {
    var picked = document.querySelector('input[name="where"]:checked');
    return picked ? picked.id : 'w-online';
  }

  function syncReveals() {
    var where = currentWhere();
    revealOnline.hidden = (where === 'w-person');
    revealPerson.hidden = (where === 'w-online');
  }

  Array.prototype.forEach.call(document.querySelectorAll('input[name="where"]'), function (radio) {
    radio.addEventListener('change', syncReveals);
  });
  syncReveals();

  /* Pre-fill the timezone so nobody has to think about it. It's only a hint —
     the field stays editable. */
  (function prefillTimezone() {
    if (!timezoneField) return;
    var zone = '';
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch (e) { /* older browser: leave it blank */ }

    if (zone) {
      var offset = -new Date().getTimezoneOffset() / 60;
      var sign = offset >= 0 ? '+' : '−';
      timezoneField.value = zone.replace(/_/g, ' ') + ' (UTC' + sign + Math.abs(offset) + ')';
    }
    timezoneField.placeholder = 'e.g. Madrid, or GMT+1';
  })();

  /* ---- message ---- */

  function checkedSubjects() {
    return Array.prototype.slice
      .call(document.querySelectorAll('#subjects input:checked'))
      .map(function (input) { return input.value; });
  }

  function buildMessage() {
    var name = value('name');
    var student = value('student');
    var subjects = checkedSubjects();
    var where = document.querySelector('input[name="where"]:checked');
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
    lines.push('Where: ' + (where ? where.value : 'Not specified'));

    if (!revealOnline.hidden && value('timezone')) lines.push('I’m in: ' + value('timezone'));
    if (!revealPerson.hidden && value('based')) lines.push('Based in: ' + value('based'));

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
    var subjects = checkedSubjects();
    var subjectLine = 'Lesson enquiry' + (subjects.length ? ' — ' + subjects.join(', ') : '');

    previewText.textContent = message;

    /* wa.me in the SAME tab. Opening it in a new tab breaks the handoff to the
       WhatsApp app on iOS, which is what lands people on the download page. */
    whatsappLink.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);

    /* mailto: hands over to whatever the device has registered as its mail
       handler, which isn't always where the person actually reads mail. */
    emailLink.href = 'mailto:' + EMAIL_ADDRESS +
      '?subject=' + encodeURIComponent(subjectLine) +
      '&body=' + encodeURIComponent(message);

    /* ...so offer Gmail's web compose as a way round that. */
    if (gmailLink) {
      gmailLink.href = 'https://mail.google.com/mail/?view=cm&fs=1' +
        '&to=' + encodeURIComponent(EMAIL_ADDRESS) +
        '&su=' + encodeURIComponent(subjectLine) +
        '&body=' + encodeURIComponent(message);
    }

    preview.hidden = false;
    copyButton.textContent = 'Copy the message instead';

    preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  copyButton.addEventListener('click', function () {
    var message = previewText.textContent;

    function done() {
      copyButton.textContent = 'Copied';
      setTimeout(function () { copyButton.textContent = 'Copy the message instead'; }, 2000);
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
