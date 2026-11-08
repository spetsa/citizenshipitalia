/* ============================================================
   CITIZENSHIP ITALIA — Main JS
   ============================================================ */

'use strict';

// --- Navbar scroll behaviour ---
(function () {
  var navbar = document.querySelector('.navbar');
  if (!navbar) return;

  // On the light (scrolled) bar, show the dark logo, which keeps the flag colours
  var logo = navbar.querySelector('.navbar__logo img');
  var light = logo ? logo.getAttribute('src') : '';
  var LOGO_RE = /logo-text-white(-\d+w)?\.webp$/;
  var dark = LOGO_RE.test(light) ? light.replace(LOGO_RE, 'logo-text.webp') : '';
  if (dark) { navbar.classList.add('has-dark-logo'); new Image().src = dark; }

  function onScroll() {
    var on = window.scrollY > 40;
    navbar.classList.toggle('scrolled', on);
    if (dark) { var want = on ? dark : light; if (logo.getAttribute('src') !== want) logo.setAttribute('src', want); }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// --- Mobile nav toggle ---
(function () {
  var toggle = document.querySelector('.navbar__toggle');
  var mobileNav = document.querySelector('.mobile-nav');
  if (!toggle || !mobileNav) return;

  toggle.addEventListener('click', function () {
    var isOpen = mobileNav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close on link click
  mobileNav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      mobileNav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // Mark current page link as active in mobile nav
  var clean = function (p) { return (p || '').split('#')[0].replace(/\.html$/, '').replace(/^index$/, ''); };
  var currentPath = clean(window.location.pathname.split('/').pop());
  mobileNav.querySelectorAll('a').forEach(function (link) {
    var href = link.getAttribute('href') || '';
    var linkPage = clean(href.replace(/\/$/, '').split('/').pop());
    if (href.charAt(0) !== '#' && linkPage === currentPath) {
      link.classList.add('active');
    }
  });
})();

// --- FAQ Accordion ---
(function () {
  var items = document.querySelectorAll('.faq-item');
  if (!items.length) return;

  items.forEach(function (item) {
    var btn = item.querySelector('.faq-item__question');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      // Close all
      items.forEach(function (i) { i.classList.remove('open'); });
      // Open clicked if it was closed
      if (!isOpen) item.classList.add('open');
    });
  });
})();

// --- Eligibility Quiz ---
(function () {
  var quizEl = document.getElementById('eligibility-quiz');
  if (!quizEl) return;

  var progressBar = quizEl.querySelector('.quiz-progress__bar');
  var currentStep = 0;
  var answers = {};
  var stepHistory = [];

  // EU Court update signup: handled by the HubSpot signup handler at the end of this file.

  // Quiz data — built around Article 3-bis of Law 91/1992 (as amended by Law 74/2025), updated November 2026.
  // Entries may be functions so question text can adapt to earlier answers.
  function rel() { return answers.ancestor === 'grandparent' ? 'grandparent' : 'parent'; }

  var quizData = {
    ancestor: {
      question: 'Who is your closest Italian ancestor?',
      sublabel: 'Choose the closest person in your direct line who is (or was) an Italian citizen. They don\'t need to have been born in Italy.',
      options: [
        { id: 'parent',           icon: '👨‍👩‍👧', label: 'Parent',                       sub: 'My mother or father is (or was) Italian' },
        { id: 'grandparent',      icon: '👴',      label: 'Grandparent',                  sub: 'My grandmother or grandfather is (or was) Italian' },
        { id: 'greatgrandparent', icon: '📜',      label: 'Great-grandparent or earlier', sub: 'My closest Italian ancestor is 3+ generations back' }
      ]
    },
    other_cit: function () {
      var r = rel();
      return {
        question: 'Did your ' + r + ' ever become a citizen of another country?',
        sublabel: 'Since 2025, the parent or grandparent you rely on must have held only Italian citizenship when you were born (or when they died, if earlier). For example, becoming a U.S. or Canadian citizen.',
        options: [
          { id: 'never',  icon: '✅', label: 'No — Italian citizenship only',  sub: 'They never held any other citizenship' },
          { id: 'after',  icon: '📅', label: 'Yes — but only after I was born', sub: 'They became a citizen elsewhere after my birth' },
          { id: 'before', icon: '⚠️', label: 'Yes — before I was born',         sub: 'They already held another citizenship when I was born' },
          { id: 'unsure', icon: '🔍', label: 'Not sure',                        sub: 'I don\'t have their naturalization records yet' }
        ]
      };
    },
    gp_check: {
      question: 'Did your Italian grandparent on that side hold only Italian citizenship?',
      sublabel: 'If your parent held another citizenship, a grandparent may still qualify you — if that grandparent never held another citizenship before your birth (or before their death).',
      options: [
        { id: 'yes',    icon: '✅', label: 'Yes — Italian citizenship only', sub: 'My grandparent never became a citizen of another country before my birth' },
        { id: 'no',     icon: '❌', label: 'No',                             sub: 'My grandparent also held another citizenship, or wasn\'t Italian' },
        { id: 'unsure', icon: '🔍', label: 'Not sure',                       sub: 'I don\'t know yet' }
      ]
    },
    parent_res: {
      question: 'Did your parent live in Italy for at least two continuous years after becoming an Italian citizen, and before you were born?',
      sublabel: 'This is a separate route under the 2025 rules. It applies only to a parent (not a grandparent), and the two years must come after they became a citizen.',
      options: [
        { id: 'yes',    icon: '🏠', label: 'Yes',      sub: 'My parent lived in Italy for 2+ continuous years as a citizen before my birth' },
        { id: 'no',     icon: '❌', label: 'No',       sub: 'They did not, or my parent was not an Italian citizen' },
        { id: 'unsure', icon: '🔍', label: 'Not sure', sub: 'I don\'t have records of where they lived' }
      ]
    },
    started: {
      question: 'By March 27, 2025, had you already started a citizenship case?',
      sublabel: 'Cases started by 11:59 PM Rome time on March 27, 2025 are assessed under the old rules (no generational limit).',
      options: [
        { id: 'filed',    icon: '📋', label: 'Yes — application submitted or court case filed', sub: 'A complete application was submitted, or a court case was filed, by the cutoff' },
        { id: 'appt',     icon: '📅', label: 'Yes — I had been given an appointment date',      sub: 'The consulate or municipality had communicated my appointment date by the cutoff' },
        { id: 'waitlist', icon: '⏳', label: 'Only requested an appointment or joined a waitlist', sub: 'I had not been given an appointment date' },
        { id: 'no',       icon: '❌', label: 'No',                                                sub: 'I had not started' }
      ]
    },
    chain: {
      question: 'Did any Italian ancestor in your line become a citizen of another country before the next person in your line was born?',
      sublabel: 'Under the old rules, the citizenship chain must be unbroken. A naturalization before the next generation was born generally breaks it.',
      options: [
        { id: 'no',     icon: '✅', label: 'No',       sub: 'Each naturalization (if any) happened after the next person was born' },
        { id: 'yes',    icon: '⚠️', label: 'Yes',      sub: 'At least one ancestor naturalized before their child in my line was born' },
        { id: 'unsure', icon: '🔍', label: 'Not sure', sub: 'I don\'t have all the naturalization dates yet' }
      ]
    },
    line1948: {
      question: 'Does your line pass through an Italian woman whose child was born before January 1, 1948?',
      sublabel: 'Consulates don\'t recognize citizenship passed from a mother to a child born before 1948. These "1948 cases" are decided by Italian courts.',
      options: [
        { id: 'no',     icon: '👨', label: 'No',       sub: 'My line passes only through men before 1948, or every child was born in 1948 or later' },
        { id: 'yes',    icon: '⚖️', label: 'Yes',      sub: 'An Italian woman in my line had her child (my ancestor) before 1948' },
        { id: 'unsure', icon: '🔍', label: 'Not sure', sub: 'I\'m not sure' }
      ]
    }
  };

  // --- Routing ---
  function getNextStep(stepKey, answer) {
    if (stepKey === 'ancestor') {
      return answer === 'greatgrandparent' ? 'started' : 'other_cit';
    }
    if (stepKey === 'other_cit') {
      if (answer === 'never' || answer === 'after') return 'line1948';  // Article 3-bis(c) likely met
      if (answer === 'unsure') return 'line1948';                        // amber result, still screen 1948
      // 'before': this person fails 3-bis(c)
      return answers.ancestor === 'parent' ? 'gp_check' : 'parent_res';
    }
    if (stepKey === 'gp_check') {
      if (answer === 'yes' || answer === 'unsure') return 'line1948';
      return 'parent_res';
    }
    if (stepKey === 'parent_res') {
      if (answer === 'yes' || answer === 'unsure') return 'line1948';
      return 'started';
    }
    if (stepKey === 'started') {
      if (answer === 'filed' || answer === 'appt') return 'chain';
      if (answers.ancestor === 'greatgrandparent' && answer !== 'waitlist' && answer !== 'no') return 'chain';
      if (answers.ancestor === 'greatgrandparent') return 'ggp_parent_res';
      return 'done';
    }
    if (stepKey === 'ggp_parent_res') {
      if (answer === 'yes' || answer === 'unsure') return 'line1948';
      return 'done';
    }
    if (stepKey === 'chain') return 'line1948';
    return 'done';
  }
  quizData.ggp_parent_res = quizData.parent_res;

  function getPrevStep(stepKey) {
    var idx = stepHistory.indexOf(stepKey);
    return idx > 0 ? stepHistory[idx - 1] : null;
  }

  // --- Labels / Progress ---
  function stepIndex(stepKey) {
    var idx = stepHistory.indexOf(stepKey);
    return idx !== -1 ? idx + 1 : 1;
  }
  function stepLabel(stepKey)   { return 'Question ' + stepIndex(stepKey); }
  function stepCounter(stepKey) { return 'Question ' + stepIndex(stepKey); }
  function updateProgress(pct)  { if (progressBar) progressBar.style.width = pct + '%'; }
  function progressPct(stepKey) { return Math.min(90, stepIndex(stepKey) * 18); }

  // --- Result logic ---
  var NOTE_REVIEW = ' Eligibility always depends on dates and documents, which we confirm on the call.';
  var NOTE_1948   = ' Because your line passes through an Italian woman to a child born before 1948, this would be a 1948 case, which must be decided by an Italian court rather than a consulate.';

  function getResult() {
    var a = answers;
    var is1948 = a.line1948 === 'yes';
    var unsure1948 = a.line1948 === 'unsure';
    var routeLabel = is1948 ? '1948 Court Route' : 'Consulate Route (or municipality, if you relocate to Italy)';

    // 1. Grandfathered: case started by March 27, 2025 (old rules)
    if (a.started === 'filed' || a.started === 'appt') {
      var apptNote = a.started === 'appt'
        ? ' Note: an appointment counts only if the consulate or municipality had communicated the date to you by 11:59 PM Rome time on March 27, 2025, and you submit your complete application on that date.'
        : '';
      if (a.chain === 'yes') {
        return { type: 'amber', bookable: true, icon: '🔍',
          title: 'Your case may follow the old rules — but the chain needs review',
          body: 'Because your case was started before the March 27, 2025 cutoff, it may be assessed under the pre-2025 rules, with no generational limit. However, a naturalization before the next generation was born usually breaks the citizenship chain, so we need to look at the exact dates and whether another line in your family works.' + apptNote,
          cta: 'Book a Free Case Review' };
      }
      return { type: a.chain === 'unsure' || unsure1948 ? 'amber' : 'green', bookable: true, icon: '📋',
        title: 'Your case may be assessed under the pre-2025 rules',
        body: 'Because your case was started before the March 27, 2025 cutoff, it may follow the old rules, with no generational limit. Since the Court of Cassation\'s July 2026 ruling, an ancestor\'s naturalization while their child was a minor is also much less likely to be an obstacle.' + (is1948 ? NOTE_1948 : '') + apptNote + NOTE_REVIEW,
        route: is1948 ? '1948 Court Route' : 'Pre-2025 rules (transitional)',
        cta: 'Book Your Free Consultation' };
    }

    // 2. Article 3-bis(c): parent or grandparent with exclusively Italian citizenship
    var meetsC = a.other_cit === 'never' || a.other_cit === 'after' || a.gp_check === 'yes';
    var maybeC = a.other_cit === 'unsure' || a.gp_check === 'unsure';
    if (meetsC) {
      var who = a.gp_check === 'yes' ? 'grandparent' : rel();
      var afterNote = (a.other_cit === 'after' && a.gp_check !== 'yes')
        ? ' Because your ' + who + ' took another citizenship only after you were born, we\'ll confirm how the consulate assesses the dates in your case.'
        : '';
      return { type: unsure1948 ? 'amber' : 'green', bookable: true, icon: is1948 ? '⚖️' : '✅',
        title: is1948 ? 'You may be eligible — 1948 court route' : 'You appear to meet the 2025 rules',
        body: 'Under Article 3-bis (Law 74/2025), a ' + who + ' who held only Italian citizenship when you were born can qualify you, provided the citizenship chain down to you is unbroken.' + afterNote + (is1948 ? NOTE_1948 : '') + (unsure1948 ? ' We\'ll also check whether your line involves a 1948 case.' : '') + NOTE_REVIEW,
        route: routeLabel,
        cta: 'Book Your Free Consultation' };
    }

    // 3. Article 3-bis(d): parent two-year residence
    var res = a.parent_res || a.ggp_parent_res;
    if (res === 'yes') {
      return { type: 'green', bookable: true, icon: '🏠',
        title: 'You may qualify through your parent\'s residence in Italy',
        body: 'Under Article 3-bis(d), a parent who lived in Italy for at least two continuous years after becoming an Italian citizen, and before you were born, can qualify you. We\'ll confirm this with residence records (such as a certificato storico di residenza).' + (is1948 ? NOTE_1948 : '') + NOTE_REVIEW,
        route: routeLabel,
        cta: 'Book Your Free Consultation' };
    }

    // 4. Uncertain answers — worth a review
    if (maybeC || res === 'unsure') {
      return { type: 'amber', bookable: true, icon: '🔍',
        title: 'Possibly eligible — a few dates need confirming',
        body: 'Your eligibility under the 2025 rules depends on details we can check together: whether your parent or grandparent ever held another citizenship before your birth, or whether your parent lived in Italy for two years after becoming a citizen. Book a free call and we\'ll review the records with you.',
        cta: 'Book a Free Case Review' };
    }

    // 5. Not eligible under current law — explain honestly, point to what may change
    var waitNote = a.started === 'waitlist'
      ? ' Requesting an appointment or joining a waitlist before the cutoff does not, by itself, qualify for the old rules.'
      : '';
    return { type: 'red', bookable: false, icon: '⚖️',
      title: 'Not eligible for a new application under current law',
      body: 'Based on your answers, you don\'t appear to meet Article 3-bis, which since 2025 requires a parent or grandparent who held only Italian citizenship, or a parent who lived in Italy for two years after becoming a citizen.' + waitNote +
        ' Two things could still matter: the EU Court of Justice is reviewing the law (case C-816/26), and former citizens born in Italy who lost citizenship before August 15, 1992 can reacquire it by declaration until December 31, 2027. If either may apply to your family, email us and we\'ll let you know where you stand.'
    };
  }

  // Lineage terms are now built into the question functions above.
  function getLineageTerms() { return null; }

  // --- Render ---
  function renderStep(stepKey) {
    var data = typeof quizData[stepKey] === 'function' ? quizData[stepKey]() : quizData[stepKey];
    var container = document.getElementById('quiz-dynamic');
    if (!container || !data) return;

    // Resolve dynamic question/option text based on ancestor selection
    var lt = getLineageTerms();
    if (lt) {
      if (stepKey === 2) {
        data = {
          question: lt.step2_q,
          sublabel: data.sublabel,
          options: [
            data.options[0], // No — they never naturalized (unchanged)
            { id: 'after',  icon: '📅', label: lt.step2_after.label,  sub: lt.step2_after.sub },
            { id: 'before', icon: '⚠️', label: lt.step2_before.label, sub: lt.step2_before.sub },
            data.options[3]  // Not sure (unchanged)
          ]
        };
      } else if (stepKey === 'minor_law') {
        data = {
          question: lt.minor_q,
          sublabel: data.sublabel,
          options: [
            { id: 'no',     icon: '✅', label: lt.minor_no.label,  sub: lt.minor_no.sub },
            { id: 'yes',    icon: '⚠️', label: lt.minor_yes.label, sub: lt.minor_yes.sub },
            data.options[2]  // Not sure (unchanged)
          ]
        };
      }
    }

    var optionsHTML = data.options.map(function (opt) {
      return '<button class="quiz-option" data-value="' + opt.id + '" type="button">' +
        '<span class="quiz-option__icon">' + opt.icon + '</span>' +
        '<span>' +
          '<span class="quiz-option__label">' + opt.label + '</span>' +
          '<span class="quiz-option__sublabel">' + opt.sub + '</span>' +
        '</span>' +
      '</button>';
    }).join('');

    var prevStep = getPrevStep(stepKey);

    container.innerHTML =
      '<div class="quiz-header">' +
        '<p class="quiz-step-label">' + stepLabel(stepKey) + '</p>' +
        '<h2>' + data.question + '</h2>' +
        '<p>' + data.sublabel + '</p>' +
      '</div>' +
      '<div class="quiz-body">' +
        '<div class="quiz-options">' + optionsHTML + '</div>' +
      '</div>' +
      '<div class="quiz-nav">' +
        (prevStep !== null
          ? '<button class="quiz-nav__back" id="quiz-back" type="button">← Back</button>'
          : '<span></span>') +
        '<span class="color-muted" style="font-size:0.8rem;">' + stepCounter(stepKey) + '</span>' +
      '</div>';

    // Option click — route forward
    container.querySelectorAll('.quiz-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        answers[stepKey] = this.dataset.value;
        var idxNow = stepHistory.indexOf(stepKey);
        stepHistory.slice(idxNow + 1).forEach(function (k) { delete answers[k]; });
        var next = getNextStep(stepKey, this.dataset.value);
        if (next === 'done') {
          updateProgress(100);
          renderResult();
        } else {
          // Trim future history and push next step
          var idx = stepHistory.indexOf(stepKey);
          stepHistory = stepHistory.slice(0, idx + 1);
          stepHistory.push(next);
          currentStep = next;
          updateProgress(progressPct(next));
          renderStep(next);
        }
      });
    });

    // Back button
    var backBtn = container.querySelector('#quiz-back');
    if (backBtn && prevStep !== null) {
      backBtn.addEventListener('click', function () {
        currentStep = prevStep;
        updateProgress(progressPct(prevStep));
        renderStep(prevStep);
      });
    }
  }

  function renderResult() {
    var result = getResult();
    var container = document.getElementById('quiz-dynamic');
    if (!container) return;

    var calendlySection = document.getElementById('calendly-section');
    if (calendlySection) calendlySection.innerHTML = '';

    var iconClass = 'quiz-result__icon--' + result.type;
    // Hard-stop (bookable: false) — show email contact only, no Calendly
    var ctaBlock;
    if (result.bookable === false) {
      ctaBlock =
        '<div class="result-booking-card">' +
          '<p style="font-size:0.875rem; color:var(--gray-700); text-align:center; margin:0 0 var(--space-sm);">If you believe there\'s an error in your answers or have additional context to share, feel free to reach out.</p>' +
          '<a href="mailto:team@citizenshipitalia.com" class="btn btn--outline result-booking-card__btn">Contact Us by Email →</a>' +
          '<div class="result-email">' +
            '<span class="result-email__label">Or write to us at</span>' +
            '<span class="result-email__row">' +
              '<span class="result-email__address">team@citizenshipitalia.com</span>' +
              '<button type="button" class="result-email__copy" id="quiz-copy-email" aria-label="Copy email address">Copy</button>' +
            '</span>' +
          '</div>' +
        '</div>' +
        '<form class="result-signup" id="quiz-signup" data-hs-signup="Eligibility quiz (not eligible result)" novalidate>' +
          '<p class="result-signup__title">Get notified if the EU Court ruling changes this</p>' +
          '<p class="result-signup__text">The EU Court of Justice is reviewing the 2025 law (case C-816/26). Leave your email and we\'ll let you know if the ruling opens a path for your family.</p>' +
          '<div class="result-signup__row">' +
            '<label for="quiz-signup-email" class="visually-hidden">Email address</label>' +
            '<input type="email" id="quiz-signup-email" name="email" required autocomplete="email" placeholder="you@example.com">' +
            '<input type="text" name="company_website" tabindex="-1" autocomplete="off" class="visually-hidden" aria-hidden="true">' +
            '<button type="submit" class="btn btn--gold btn--sm">Notify me</button>' +
          '</div>' +
          '<p class="result-signup__status" role="status" aria-live="polite"></p>' +
        '</form>';
    } else {
      var ctaLabel    = result.type === 'green' ? 'Book Your Free Consultation →' : result.cta + ' →';
      var ctaSubtitle = result.type === 'green'
        ? 'Choose a time that works for you. Free, no obligation, 30 minutes.'
        : 'Tell us about your case — we\'ll review it on a free 30-minute call.';
      ctaBlock =
        '<div class="result-booking-card">' +
          '<a href="https://calendly.com/citizenshipitalia/30min" target="_blank" rel="noopener" class="btn btn--gold btn--lg result-booking-card__btn">' +
            ctaLabel +
          '</a>' +
          '<p class="result-booking-card__note">' + ctaSubtitle + '</p>' +
        '</div>';
    }

    var outcome = result.type === 'red' ? 'Not eligible under current law'
      : /pre-2025|old rules/i.test(result.title) ? 'Transitional case'
      : result.type === 'amber' ? 'Needs legal review'
      : 'Likely eligible';

    window.ciQuizAnswers = answers;
    container.innerHTML =
      '<div class="quiz-result">' +
        '<div class="quiz-result__icon ' + iconClass + '">' + result.icon + '</div>' +
        '<span class="quiz-result__outcome quiz-result__outcome--' + result.type + '">' + outcome + '</span>' +
        '<h3>' + result.title + '</h3>' +
        '<p>' + result.body + '</p>' +
        '<p class="quiz-result__disclaimer">This is a preliminary screening, not a final legal determination. Cases involving naturalization dates, a maternal line before 1948, filings before March 27, 2025 or other exceptions may need a full legal review.</p>' +
        ctaBlock +
        '<button class="quiz-result__restart" id="quiz-restart" type="button">↺ Start over</button>' +
      '</div>';

    // Calendly iframe — for bookable green results on all screen sizes (taller on phones)
    if (result.bookable && result.type === 'green' && calendlySection) {
      var calHeight = window.innerWidth < 680 ? 1050 : 700;
      var domain = window.location.hostname || 'citizenshipitalia.com';
      calendlySection.innerHTML =
        '<div class="calendly-embed-section">' +
          '<p class="calendly-embed-section__label">Select a time below to book your free consultation</p>' +
          '<div class="calendly-embed-section__frame">' +
            '<iframe' +
              ' src="https://calendly.com/citizenshipitalia/30min?embed_domain=' + domain + '&embed_type=Inline&hide_gdpr_banner=1"' +
              ' width="100%" height="' + calHeight + '" style="min-height:' + calHeight + 'px" frameborder="0" scrolling="yes"' +
              ' title="Book a free consultation with Citizenship Italia">' +
            '</iframe>' +
          '</div>' +
        '</div>';
    }

    if (!window._calendlyListenerAttached) {
      window.addEventListener('message', function(event) {
        if (event.origin && event.origin.includes('calendly.com') && event.data && event.data.event === 'calendly.event_scheduled') {
          window.location.href = 'thank-you';
        }
      });
      window._calendlyListenerAttached = true;
    }

    var copyBtn = container.querySelector('#quiz-copy-email');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var addr = 'team@citizenshipitalia.com';
        var done = function () {
          copyBtn.textContent = 'Copied';
          copyBtn.classList.add('is-copied');
          setTimeout(function () { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('is-copied'); }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(addr).then(done, function () { selectAddress(); });
        } else { selectAddress(); }
        function selectAddress() {
          var el = container.querySelector('.result-email__address');
          var range = document.createRange(); range.selectNodeContents(el);
          var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
          try { if (document.execCommand('copy')) done(); } catch (e) {}
        }
      });
    }

    var restartBtn = container.querySelector('#quiz-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', function () {
        answers = {};
        stepHistory = ['ancestor'];
        currentStep = 'ancestor';
        updateProgress(progressPct('ancestor'));
        if (calendlySection) calendlySection.innerHTML = '';
        renderStep('ancestor');
      });
    }
  }

  // Init
  stepHistory = ['ancestor'];
  currentStep = 'ancestor';
  updateProgress(progressPct('ancestor'));
  renderStep('ancestor');
})();

// --- Process steps mobile accordion ---
(function () {
  var steps = document.querySelectorAll('.process-step');
  if (!steps.length) return;

  function isMobile() { return window.innerWidth <= 768; }

  function initAccordion() {
    if (!isMobile()) {
      // Desktop: remove all accordion state, make sure content is visible
      steps.forEach(function (step) {
        step.classList.remove('accordion-step', 'open');
        step.style.cursor = '';
      });
      return;
    }

    // Mobile: wire up accordion
    steps.forEach(function (step, index) {
      if (!step.classList.contains('accordion-step')) {
        step.classList.add('accordion-step');
        step.addEventListener('click', function () {
          var isOpen = step.classList.contains('open');
          steps.forEach(function (s) { s.classList.remove('open'); });
          if (!isOpen) step.classList.add('open');
        });
      }
      // First step open by default
      if (index === 0) step.classList.add('open');
      else step.classList.remove('open');
    });
  }

  initAccordion();
  window.addEventListener('resize', initAccordion);
})();

// --- Smooth scroll for anchor links ---
document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
  anchor.addEventListener('click', function (e) {
    var target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    var offset = 80;
    var top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: top, behavior: 'smooth' });
  });
});

// --- Sticky CTA bar dismiss button ---
(function () {
  var bar = document.getElementById('sticky-cta');
  if (!bar) return;

  var closeBtn = document.createElement('button');
  closeBtn.className = 'sticky-cta-bar__close';
  closeBtn.setAttribute('aria-label', 'Dismiss');
  closeBtn.innerHTML = '&times;';
  bar.appendChild(closeBtn);

  closeBtn.addEventListener('click', function () {
    bar.classList.add('sticky-cta-bar--dismissed');
    // Remove bottom padding so no gap is left behind
    document.body.classList.remove('has-sticky-cta');
  });
})();

// --- Scroll-triggered sticky CTA messaging ---
// Report §5.5 — contextual messaging based on scroll position
(function () {
  var bar = document.getElementById('sticky-cta');
  if (!bar) return;
  var textEl = bar.querySelector('.sticky-cta-bar__text');
  if (!textEl) return;

  var messages = [
    { threshold: 0,    html: '<strong>Not sure if you qualify?</strong><span class="sticky-cta-bar__sub"> Free consultation — no commitment</span>' },
    { threshold: 0.30, html: '<strong>Find your route in 2 minutes</strong><span class="sticky-cta-bar__sub"> Take the free eligibility quiz</span>' },
    { threshold: 0.62, html: '<strong>Ready to get started?</strong><span class="sticky-cta-bar__sub"> Book your free 30-minute consultation</span>' },
    { threshold: 0.88, html: '<strong>Join 150+ families</strong><span class="sticky-cta-bar__sub"> Check your eligibility today — it\'s free</span>' }
  ];

  textEl.innerHTML = messages[0].html;
  var lastIdx = 0;
  function updateMsg() {
    var pageH = document.body.scrollHeight - window.innerHeight;
    var pct = pageH > 0 ? window.scrollY / pageH : 0;
    for (var i = messages.length - 1; i >= 0; i--) {
      if (pct >= messages[i].threshold) {
        if (lastIdx !== i) {
          textEl.innerHTML = messages[i].html;
          lastIdx = i;
        }
        break;
      }
    }
  }
  window.addEventListener('scroll', updateMsg, { passive: true });
})();

// --- Sticky CTA visibility: appear after the hero, hide while the quiz or booking calendar is on screen ---
(function () {
  var bar = document.getElementById('sticky-cta');
  if (!bar) return;
  var hero = document.querySelector('.hero, .page-header');
  var onScreen = {};
  function threshold() {
    if (hero) { var r = hero.getBoundingClientRect(); return r.bottom + window.scrollY - 80; }
    return window.innerHeight * 0.6;
  }
  function update() {
    var past = window.scrollY > threshold();
    var blocked = Object.keys(onScreen).some(function (k) { return onScreen[k]; });
    bar.classList.toggle('sticky-cta-bar--visible', past && !blocked);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { onScreen[e.target.id || e.target.className] = e.isIntersecting; });
      update();
    }, { threshold: 0.15 });
    var watch = function () {
      document.querySelectorAll('#eligibility-quiz, .quiz-wrapper, #calendly-section, .calendly-embed-section, #case-estimator').forEach(function (el) { io.observe(el); });
    };
    watch();
    document.addEventListener('click', function () { setTimeout(watch, 300); }, true);
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

// --- Lazy load images ---
if ('IntersectionObserver' in window) {
  var imgObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          imgObserver.unobserve(img);
        }
      }
    });
  }, { rootMargin: '200px 0px' });

  document.querySelectorAll('img[data-src]').forEach(function (img) {
    imgObserver.observe(img);
  });
}

// --- Pricing page: case estimator (uses the published fee schedule) ---
// Total = service fee (consulate package or legal fee) + €600 per applicant
//       + translations: 2 per person in the line (birth + marriage), Italian ancestor down to applicant,
//         + 1 for the Italian ancestor's naturalization record.
(function () {
  var root = document.getElementById('case-estimator');
  if (!root) return;
  var FEES = {
    consulate: 2500,         // Administrative Package Assembly
    legal: 4500,             // Court Case Application & Representation (court and 1948)
    familyMember: 200,       // per additional immediate family member
    cousin: 500,             // per additional first cousin
    translation: 80,         // per document (up to 4 pages)
    govFeeEur: 600,          // per applicant
    eurToUsd: 650 / 600      // matches the ~$650 shown on this page
  };
  var $ = function (id) { return document.getElementById(id); };
  var money = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
  var num = function (id) { var v = parseInt($(id).value, 10); return isNaN(v) || v < 0 ? 0 : Math.min(v, 20); };
  var checked = function (name) { var el = root.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ''; };

  function calc() {
    var route = checked('est-route');
    var gen = parseInt(checked('est-gen'), 10) || 2;
    var family = num('est-family'), cousins = num('est-cousins');
    var applicants = 1 + family + cousins;
    var service = (route === 'consulate' ? FEES.consulate : FEES.legal) +
                  family * FEES.familyMember + cousins * FEES.cousin;
    // Line: Italian ancestor + each generation down to the applicant = gen + 1 people, 2 records each,
    // plus the ancestor's naturalization record. Each family member adds their own birth + marriage;
    // each first cousin adds their own and their parent's.
    var translations = (gen + 1) * 2 + 1 + family * 2 + cousins * 4;
    var docs = translations * FEES.translation;
    var govEur = applicants * FEES.govFeeEur;
    var govUsd = govEur * FEES.eurToUsd;
    $('est-service').textContent = money(service);
    $('est-docs-label').textContent = 'Translations (' + translations + ' documents)';
    $('est-docs').textContent = money(docs);
    $('est-gov').textContent = '€' + govEur.toLocaleString('en-US') + ' (~' + money(govUsd) + ')';
    $('est-total').textContent = money(service + docs + govUsd);
    $('est-eur-note').textContent = 'for ' + applicants + (applicants === 1 ? ' applicant' : ' applicants') +
      (route === 'consulate' ? ' · consulate route' : route === 'court' ? ' · court route' : ' · 1948 court case');
  }

  root.querySelectorAll('input').forEach(function (i) { i.addEventListener('input', calc); i.addEventListener('change', calc); });
  function syncSteppers() {
    root.querySelectorAll('.est-stepper__btn').forEach(function (b) {
      var inp = document.getElementById(b.getAttribute('data-for')); var v = parseInt(inp.value, 10) || 0;
      b.disabled = b.getAttribute('data-step') === '-1' ? v <= +inp.min : v >= +inp.max;
    });
  }
  root.querySelectorAll('.est-stepper__btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var inp = document.getElementById(this.getAttribute('data-for'));
      var v = (parseInt(inp.value, 10) || 0) + parseInt(this.getAttribute('data-step'), 10);
      inp.value = Math.max(+inp.min, Math.min(+inp.max, v));
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
  root.querySelectorAll('.est-stepper input').forEach(function (i) {
    i.addEventListener('input', syncSteppers);
    i.addEventListener('blur', function () { var v = parseInt(i.value, 10); i.value = isNaN(v) ? 0 : Math.max(+i.min, Math.min(+i.max, v)); syncSteppers(); calc(); });
  });
  syncSteppers();
  calc();
})();

// --- Analytics: conversion and behaviour events for Google Analytics 4 (and the Reddit pixel) ---
// Event names follow GA4 recommended events where one exists (generate_lead, sign_up).
(function () {
  function track(name, params) {
    params = params || {};
    try { if (typeof window.gtag === 'function') window.gtag('event', name, params); } catch (e) {}
  }
  window.ciTrack = track;
  var path = location.pathname;
  function section(el) {
    if (el.closest('.sticky-cta-bar')) return 'sticky_bar';
    if (el.closest('.navbar, .mobile-nav')) return 'navigation';
    if (el.closest('footer')) return 'footer';
    if (el.closest('.hero, .page-header')) return 'hero';
    var s = el.closest('section[id]'); if (s) return s.id;
    if (el.closest('.consult-callout')) return 'article_callout';
    if (el.closest('.estimator')) return 'estimator';
    if (el.closest('.quiz-result')) return 'quiz_result';
    return 'body';
  }
  function text(el) { return (el.textContent || '').replace(/\s+/g, ' ').replace(/[→+]\s*$/, '').trim().slice(0, 80); }

  // Link clicks: contact methods, booking links, consultation CTAs
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (a) {
      var href = a.getAttribute('href') || '';
      if (href.indexOf('mailto:') === 0) track('contact', { contact_method: 'email', cta_section: section(a), page_path: path });
      else if (href.indexOf('tel:') === 0) track('contact', { contact_method: 'phone', cta_section: section(a), page_path: path });
      else if (href.indexOf('calendly.com') !== -1) track('book_call_click', { cta_text: text(a), cta_section: section(a), page_path: path });
      else if (/check-eligibility(\.html)?(#.*)?$/.test(href)) track('cta_click', { cta_text: text(a), cta_section: section(a), page_path: path });
      return;
    }
    var copy = e.target.closest && e.target.closest('#quiz-copy-email');
    if (copy) { track('contact', { contact_method: 'email_copy', cta_section: 'quiz_result', page_path: path }); return; }
    var q = e.target.closest && e.target.closest('.faq-item__question');
    if (q) { setTimeout(function () { var item = q.closest('.faq-item'); if (item && item.classList.contains('open')) track('faq_open', { faq_question: text(q).replace(/\+$/, '').trim(), page_path: path }); }, 0); return; }
    var opt = e.target.closest && e.target.closest('.quiz-option');
    if (opt) {
      if (!window._ciQuizStarted) { window._ciQuizStarted = true; track('quiz_start', { page_path: path }); }
      track('quiz_answer', { quiz_answer: opt.getAttribute('data-value') || '', page_path: path });
    }
  }, true);

  // Quiz result shown
  var quiz = document.getElementById('quiz-dynamic');
  if (quiz && window.MutationObserver) {
    var lastResult = null;
    new MutationObserver(function () {
      var r = quiz.querySelector('.quiz-result');
      if (!r) { lastResult = null; return; }
      if (r === lastResult) return; lastResult = r;
      var o = r.querySelector('.quiz-result__outcome');
      var type = o ? (o.className.match(/quiz-result__outcome--(\w+)/) || [])[1] : '';
      track('quiz_complete', { quiz_outcome: o ? text(o) : '', quiz_result_type: type || '', page_path: path });
    }).observe(quiz, { childList: true, subtree: true });
  }

  // Notify-me signup on the not-eligible result
  document.addEventListener('ci:signup', function (e) {
    track('sign_up', { method: 'eu_court_notify', lead_source: (e.detail && e.detail.source) || '', page_path: path });
  });

  // Calendly booking funnel (inline embed)
  window.addEventListener('message', function (ev) {
    if (!ev.origin || ev.origin.indexOf('calendly.com') === -1 || !ev.data || typeof ev.data.event !== 'string') return;
    var name = ev.data.event;
    if (name === 'calendly.event_type_viewed') track('booking_view', { page_path: path });
    else if (name === 'calendly.date_and_time_selected') track('booking_time_selected', { page_path: path });
    else if (name === 'calendly.event_scheduled') {
      track('generate_lead', { lead_source: 'calendly_booking', page_path: path, transport_type: 'beacon' });
      try { if (typeof window.rdt === 'function') window.rdt('track', 'Lead'); } catch (e2) {}
    }
  });

  // Cost estimator use (debounced; at most 5 per page view)
  var est = document.getElementById('case-estimator');
  if (est) {
    var t, sent = 0;
    est.addEventListener('input', schedule); est.addEventListener('change', schedule); est.addEventListener('click', function (e) { if (e.target.closest('.est-stepper__btn')) schedule(); });
    function schedule() { clearTimeout(t); t = setTimeout(send, 1500); }
    function send() {
      if (sent >= 5) return; sent++;
      var g = function (n) { var el = est.querySelector('input[name="' + n + '"]:checked'); return el ? el.value : ''; };
      var total = (document.getElementById('est-total') || {}).textContent || '';
      track('estimator_use', {
        estimator_route: g('est-route'), estimator_generation: g('est-gen'),
        estimator_family: +((document.getElementById('est-family') || {}).value || 0),
        estimator_cousins: +((document.getElementById('est-cousins') || {}).value || 0),
        estimate_total: +total.replace(/[^0-9.]/g, '') || 0, page_path: path
      });
    }
  }
})();

// EU Court notify-me signups -> HubSpot form "EU Court ruling - notify me".
// Any <form data-hs-signup="where it was shown"> with an email input is sent here.
(function () {
  var HS_PORTAL = '47559105';
  var HS_FORM = '901ed9fe-60e6-41be-a452-61da5a68a77c';
  function cookie(name) {
    var m = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
    return m ? decodeURIComponent(m[1]) : '';
  }
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || !form.hasAttribute || !form.hasAttribute('data-hs-signup')) return;
    e.preventDefault();
    var input = form.querySelector('input[type="email"]');
    var status = form.querySelector('.result-signup__status');
    var btn = form.querySelector('button[type="submit"]');
    var trap = form.querySelector('input[name="company_website"]');
    var email = (input.value || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      status.textContent = 'Please enter a valid email address.';
      input.focus();
      return;
    }
    if (trap && trap.value) return;
    var source = form.getAttribute('data-hs-signup');
    var note = 'Wants an email when the EU Court of Justice rules on case C-816/26. Signed up from: ' + source + '.';
    if (window.ciQuizAnswers && /quiz/i.test(source)) note += ' Quiz answers: ' + JSON.stringify(window.ciQuizAnswers);
    if (!HS_FORM) {
      window.location.href = 'mailto:team@citizenshipitalia.com?subject=' + encodeURIComponent('EU Court update request') +
        '&body=' + encodeURIComponent('Please let me know when the EU Court rules on case C-816/26. My email: ' + email);
      status.textContent = 'Your email app should open with the request ready to send.';
      return;
    }
    var context = { pageUri: window.location.href, pageName: document.title };
    var hutk = cookie('hubspotutk');
    if (hutk) context.hutk = hutk;
    btn.disabled = true;
    status.textContent = 'Sending\u2026';
    fetch('https://api.hsforms.com/submissions/v3/integration/submit/' + HS_PORTAL + '/' + HS_FORM, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: [
          { objectTypeId: '0-1', name: 'email', value: email },
          { objectTypeId: '0-1', name: 'message', value: note }
        ],
        context: context
      })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('HubSpot ' + r.status);
        form.innerHTML = '<p class="result-signup__title">You\'re on the list.</p>' +
          '<p class="result-signup__text">We\'ll email you when the EU Court rules and explain whether it changes who qualifies.</p>';
        try { document.dispatchEvent(new CustomEvent('ci:signup', { detail: { source: source } })); } catch (err) {}
      })
      .catch(function () {
        btn.disabled = false;
        status.textContent = 'Something went wrong. Please email team@citizenshipitalia.com instead.';
      });
  });
})();
