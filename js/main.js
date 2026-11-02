/* ============================================================
   CITIZENSHIP ITALIA — Main JS
   ============================================================ */

'use strict';

// --- Navbar scroll behaviour ---
(function () {
  var navbar = document.querySelector('.navbar');
  if (!navbar) return;

  function onScroll() {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
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
  var currentPath = window.location.pathname.split('/').pop() || 'index.html';
  mobileNav.querySelectorAll('a').forEach(function (link) {
    var href = link.getAttribute('href') || '';
    var linkPage = href.split('/').pop();
    if (linkPage === currentPath || (currentPath === '' && linkPage === 'index.html')) {
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
        '</div>';
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

    container.innerHTML =
      '<div class="quiz-result">' +
        '<div class="quiz-result__icon ' + iconClass + '">' + result.icon + '</div>' +
        '<h3>' + result.title + '</h3>' +
        '<p>' + result.body + '</p>' +
        ctaBlock +
        '<button class="quiz-result__restart" id="quiz-restart" type="button">↺ Start over</button>' +
      '</div>';

    // Calendly iframe — only for bookable green results on desktop
    if (result.bookable && result.type === 'green' && window.innerWidth >= 680 && calendlySection) {
      var domain = window.location.hostname || 'citizenshipitalia.com';
      calendlySection.innerHTML =
        '<div class="calendly-embed-section">' +
          '<p class="calendly-embed-section__label">Select a time below to book your free consultation</p>' +
          '<div class="calendly-embed-section__frame">' +
            '<iframe' +
              ' src="https://calendly.com/citizenshipitalia/30min?embed_domain=' + domain + '&embed_type=Inline&hide_gdpr_banner=1"' +
              ' width="100%" height="700" frameborder="0" scrolling="yes"' +
              ' title="Book a free consultation with Citizenship Italia">' +
            '</iframe>' +
          '</div>' +
        '</div>';
    }

    if (!window._calendlyListenerAttached) {
      window.addEventListener('message', function(event) {
        if (event.origin && event.origin.includes('calendly.com') && event.data && event.data.event === 'calendly.event_scheduled') {
          window.location.href = 'thank-you.html';
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
    { threshold: 0,    html: '<strong>Not sure if you qualify?</strong> Free consultation — no commitment' },
    { threshold: 0.30, html: '<strong>Find your route in 2 minutes</strong> Take the free eligibility quiz' },
    { threshold: 0.62, html: '<strong>Ready to get started?</strong> Book your free 30-minute consultation' },
    { threshold: 0.88, html: '<strong>Join 150+ families</strong> Check your eligibility today — it\'s free' }
  ];

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
