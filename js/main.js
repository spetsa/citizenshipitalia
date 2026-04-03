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

  // Quiz data — 'minor_law' is a conditional step shown only when ancestor naturalized after/unsure
  var quizData = {
    1: {
      question: 'Which Italian-born ancestor are you claiming through?',
      sublabel: 'Your eligibility route depends on which generation your Italian ancestor belongs to.',
      options: [
        { id: 'parent',           icon: '👨‍👩‍👧', label: 'Parent',                    sub: 'My mother or father was born in Italy' },
        { id: 'grandparent',      icon: '👴',      label: 'Grandparent',               sub: 'My grandmother or grandfather was born in Italy' },
        { id: 'greatgrandparent', icon: '📜',      label: 'Great-grandparent or earlier', sub: 'My Italian ancestor is 3+ generations back' }
      ]
    },
    2: {
      question: 'Did your Italian ancestor naturalize as a U.S. or Canadian citizen?',
      sublabel: 'Naturalization timing is critical — it determines whether Italian citizenship was passed down.',
      options: [
        { id: 'no',     icon: '✅', label: 'No — they never naturalized',           sub: 'They kept Italian citizenship throughout their life' },
        { id: 'after',  icon: '📅', label: 'Yes — but after their child was born',  sub: 'They naturalized after the next person in my lineage was born' },
        { id: 'before', icon: '⚠️', label: 'Yes — before their child was born',     sub: 'They naturalized before the next person in my lineage was born' },
        { id: 'unsure', icon: '🔍', label: 'Not sure',                              sub: 'I don\'t have full records yet' }
      ]
    },
    minor_law: {
      question: 'Was the next person in your lineage a minor when your ancestor naturalized?',
      sublabel: 'Under Italian law, minor children under 21 automatically lost citizenship when their parent naturalized as a foreign citizen.',
      options: [
        { id: 'no',     icon: '✅', label: 'No — they were an adult (21 or older)', sub: 'The next person in my lineage was over 21 at the time of naturalization' },
        { id: 'yes',    icon: '⚠️', label: 'Yes — they were a minor (under 21)',    sub: 'The next person in my lineage was under 21 when naturalization occurred' },
        { id: 'unsure', icon: '🔍', label: 'Not sure',                              sub: 'I don\'t know their exact ages at that time' }
      ]
    },
    3: {
      question: 'Is your Italian lineage through your mother\'s side?',
      sublabel: 'If your claim passes through a female ancestor before 1948, a special court route may apply.',
      options: [
        { id: 'no',          icon: '👨', label: 'No — paternal line only',                    sub: 'My Italian ancestor is on my father\'s side' },
        { id: 'yes_post48',  icon: '👩', label: 'Yes — mother born after 1948',               sub: 'My female Italian ancestor was born in 1948 or later' },
        { id: 'yes_pre48',   icon: '⚖️', label: 'Yes — and there\'s a pre-1948 woman in the chain', sub: 'A woman in my lineage transmitted citizenship before 1948' }
      ]
    },
    4: {
      question: 'Where do you currently live?',
      sublabel: 'Your location affects which consulate you\'d file with and wait-time estimates.',
      options: [
        { id: 'us',     icon: '🇺🇸', label: 'United States',                    sub: 'I\'d apply through my local Italian consulate' },
        { id: 'canada', icon: '🇨🇦', label: 'Canada',                           sub: 'I\'d apply through the Italian consulate in Canada' },
        { id: 'italy',  icon: '🇮🇹', label: 'I\'m open to applying from Italy', sub: 'I can travel to or relocate to Italy for the application' },
        { id: 'other',  icon: '🌍', label: 'Other country',                     sub: 'I live outside the US, Canada, and Italy' }
      ]
    },
    pre_law: {
      question: 'Were you already in the process of applying before January 2025?',
      sublabel: 'Italy\'s Law 74/2025 restricted claims to parent and grandparent lines. However, people who were already formally in the process before the law came into effect may have options through an Italian court.',
      options: [
        { id: 'yes',    icon: '📋', label: 'Yes — I have evidence of this',     sub: 'e.g. a consulate appointment booked, submitted paperwork, or other documentation showing an application was in progress' },
        { id: 'unsure', icon: '🔍', label: 'Not sure — I may have taken steps', sub: 'I started looking into it but don\'t know if it qualifies as formal evidence' },
        { id: 'no',     icon: '❌', label: 'No — I had not yet started',         sub: 'I was not in the application process before January 2025' }
      ]
    }
  };

  // --- Routing ---
  function getNextStep(stepKey, answer) {
    var ancestor = answers[1];
    var isGGP    = (ancestor === 'greatgrandparent');

    if (stepKey === 1) return 2;

    if (stepKey === 2) {
      if (answer === 'before') return 'done';      // hard stop — citizenship not transmitted
      if (answer === 'no')     return isGGP ? 'pre_law' : 3;  // never naturalized
      return 'minor_law';                          // after/unsure — must check minor law
    }

    if (stepKey === 'minor_law') {
      if (answer === 'yes') return 'done';         // hard stop — minor law bars eligibility
      return isGGP ? 'pre_law' : 3;               // continue — great-grandparent goes to pre_law check
    }

    if (stepKey === 'pre_law') return 'done';      // pre-law question always leads to result

    if (stepKey === 3) {
      if (answer === 'yes_pre48') return 'done';   // 1948 case — court only, skip location
      return 4;
    }

    if (stepKey === 4) return 'done';
    return 'done';
  }

  function getPrevStep(stepKey) {
    var idx = stepHistory.indexOf(stepKey);
    return idx > 0 ? stepHistory[idx - 1] : null;
  }

  function hasMinorLawStep() {
    return stepHistory.indexOf('minor_law') !== -1;
  }

  function hasPreLawStep() {
    return stepHistory.indexOf('pre_law') !== -1;
  }

  // --- Labels / Progress ---
  // Dynamic: use position in actual stepHistory so all path variants display correctly
  function stepIndex(stepKey) {
    var idx = stepHistory.indexOf(stepKey);
    return idx !== -1 ? idx + 1 : 1;
  }

  function totalSteps() {
    var ancestor  = answers[1];
    var hasMinor  = hasMinorLawStep();
    // Great-grandparent path ends at pre_law (no steps 3 or 4)
    if (ancestor === 'greatgrandparent') return hasMinor ? 4 : 3;
    // 1948 path ends at step 3 (no step 4)
    if (answers[3] === 'yes_pre48')      return hasMinor ? 4 : 3;
    // Standard path
    return hasMinor ? 5 : 4;
  }

  function stepLabel(stepKey) {
    return 'Step ' + stepIndex(stepKey) + ' of ' + totalSteps();
  }

  function stepCounter(stepKey) {
    return stepIndex(stepKey) + ' / ' + totalSteps();
  }

  function updateProgress(pct) {
    if (progressBar) progressBar.style.width = pct + '%';
  }

  function progressPct(stepKey) {
    return (stepIndex(stepKey) / (totalSteps() + 1)) * 100;
  }

  // --- Result logic ---
  function getResult() {
    var ancestor  = answers[1];
    var nat       = answers[2];
    var minorLaw  = answers['minor_law'];

    // Great-grandparent or earlier — Law 74/2025 applies; outcome depends on pre-law activity
    if (ancestor === 'greatgrandparent') {
      var preLaw = answers['pre_law'];

      if (preLaw === 'yes') {
        return {
          type: 'green', bookable: true,
          icon: '⚖️',
          title: 'Potentially eligible — Court Route Only',
          body: 'Italy\'s Law 74/2025 (January 2025) restricted citizenship by descent to parent and grandparent lines. However, because you were already in the process before the law changed, there may be a court route available to you. This is a complex area and we can\'t guarantee an outcome, but it\'s worth a detailed review. Please note: a consulate application is not an option here — any viable path would go through an Italian court. Book a free call and we\'ll look at your documentation together.',
          route: 'Court Route (Law 74/2025 transitional)',
          cta: 'Book Your Free Consultation'
        };
      }

      if (preLaw === 'unsure') {
        return {
          type: 'amber', bookable: true,
          icon: '🔍',
          title: 'Possibly eligible — depends on your evidence',
          body: 'Italy\'s Law 74/2025 restricted claims through great-grandparents, but applicants who were formally in the process before January 2025 may still have options via a court petition. Whether your situation qualifies depends on the type and strength of evidence you have. We can\'t make promises, but it\'s worth a conversation. A consulate route is not available for this type of case — only a court petition. Book a free call and we\'ll review what you have.',
          route: 'Court Route (subject to evidence review)',
          cta: 'Book a Free Case Review'
        };
      }

      // preLaw === 'no'
      return {
        type: 'red', bookable: false,
        icon: '⚖️',
        title: 'Unfortunately not eligible under current Italian law',
        body: 'Italy\'s Law 74/2025 (effective January 2025) limited citizenship by descent to parent and grandparent lines. Applications through great-grandparents or earlier generations are no longer accepted — and because you were not already in the process before the law changed, there is currently no available route for your case. If your circumstances change, feel free to reach out.'
      };
    }

    // Naturalized before child was born — citizenship was not transmitted
    if (nat === 'before') {
      return {
        type: 'red', bookable: false,
        icon: '❌',
        title: 'Unfortunately, we\'re unable to take on your case',
        body: 'When an Italian ancestor naturalized before the next person in the lineage was born, Italian citizenship was not transmitted through that link. We only take on cases where we can confirm citizenship passed down — so we\'re not able to move forward with this application.'
      };
    }

    // Minor law — child was under 21 at time of parent\'s naturalization
    if (minorLaw === 'yes') {
      return {
        type: 'red', bookable: false,
        icon: '❌',
        title: 'Unfortunately, we\'re unable to take on your case',
        body: 'Under Italian law (Law 555/1912), minor children under 21 automatically lost Italian citizenship when their parent naturalized as a foreign citizen. Because the next person in your lineage was a minor at that time, citizenship did not pass through. We\'re not able to take on this case.'
      };
    }

    // Minor law unsure — flag it but still allow a consultation
    if (minorLaw === 'unsure') {
      return {
        type: 'amber', bookable: true,
        icon: '🔍',
        title: 'Possibly eligible — one detail needs checking',
        body: 'Your case looks promising, but we need to confirm one thing: whether the next person in your lineage was an adult (21+) when your ancestor naturalized. If they were a minor at the time, citizenship may not have passed through. Book a free call and we\'ll review the exact dates with you.',
        cta: 'Book a Free Case Review'
      };
    }

    // 1948 maternal case — court ONLY
    if (answers[3] === 'yes_pre48') {
      return {
        type: 'green', bookable: true,
        icon: '⚖️',
        title: 'Eligible — 1948 Court Route Only',
        body: 'Your lineage passes through a woman who transmitted citizenship before 1948. Under Italian law, this type of case cannot be filed at a consulate — it must go through an Italian court petition. This is a specialised route that requires formal legal representation before an Italian court. Book a free call to review your lineage and get started.',
        route: '1948 Court Route (consulate filing not available)',
        cta: 'Book Your Free Consultation'
      };
    }

    // General eligible
    if (nat === 'no' || nat === 'after' || nat === 'unsure') {
      var route = (ancestor === 'grandparent' && answers[4] === 'italy')
        ? 'Consulate Route (from Italy)' : 'Consulate Route';

      var bodyText = ancestor === 'grandparent'
        ? 'Based on your answers, you appear eligible for Italian citizenship through your grandparent. Italy\'s Law 74/2025 (passed January 2025) now limits claims to parent and grandparent lines — your case falls within the eligible range. Book a free consultation to confirm your lineage, review your documents, and map out your route.'
        : 'Based on your answers, you appear eligible for Italian citizenship through your parent. The next step is a free consultation to confirm your lineage, review documents, and map out your application route.';

      return {
        type: 'green', bookable: true,
        icon: '✅',
        title: 'You appear eligible',
        body: bodyText,
        route: route,
        cta: 'Book Your Free Consultation'
      };
    }

    // Default
    return {
      type: 'amber', bookable: true,
      icon: '🔍',
      title: 'Let\'s review your case',
      body: 'Your situation has some nuances worth reviewing in person. Note that Italy\'s Law 74/2025 now limits citizenship by descent to parent and grandparent lines — claims through earlier generations are no longer accepted. Book a free consultation and our team will analyse your lineage and confirm whether you fall within the eligible window.',
      cta: 'Book a Free Consultation'
    };
  }

  // --- Render ---
  function renderStep(stepKey) {
    var data = quizData[stepKey];
    var container = document.getElementById('quiz-dynamic');
    if (!container || !data) return;

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
    var routeBadge = result.route
      ? '<div class="quiz-result__route-badge">Recommended Route: ' + result.route + '</div>'
      : '';

    // Hard-stop (bookable: false) — show email contact only, no Calendly
    var ctaBlock;
    if (result.bookable === false) {
      ctaBlock =
        '<div class="result-booking-card">' +
          '<p style="font-size:0.875rem; color:var(--gray-700); text-align:center; margin:0 0 var(--space-sm);">If you believe there\'s an error in your answers or have additional context to share, feel free to reach out.</p>' +
          '<a href="mailto:team@citizenshipitalia.com" class="btn btn--outline result-booking-card__btn">Contact Us by Email →</a>' +
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
        routeBadge +
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

    var restartBtn = container.querySelector('#quiz-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', function () {
        answers = {};
        stepHistory = [1];
        currentStep = 1;
        updateProgress(progressPct(1));
        if (calendlySection) calendlySection.innerHTML = '';
        renderStep(1);
      });
    }
  }

  // Init
  stepHistory = [1];
  currentStep = 1;
  updateProgress(progressPct(1));
  renderStep(1);
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
