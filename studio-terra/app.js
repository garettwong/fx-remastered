/* Studio Terra — real GSAP ScrollTrigger + Flip motion */
gsap.registerPlugin(ScrollTrigger, Flip);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]still/.test(location.search);

// nav solid on scroll
const nav = document.getElementById('nav');
addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 40), { passive: true });

// smooth in-page anchors
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const t = document.querySelector(a.getAttribute('href'));
  if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}));

if (reduce) {
  gsap.set('.reveal,.hcenter>*,.prop,.fmark', { opacity: 1 });
} else {
  // HERO entrance
  gsap.fromTo('.hcenter > *', { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12, delay: 0.35 });
  const props = gsap.utils.toArray('.prop');
  props.forEach((p, i) => {
    const r = getComputedStyle(p).transform;
    gsap.fromTo(p, { opacity: 0, scale: 0.5, y: 70 }, { opacity: 1, scale: 1, y: 0, duration: 1.2, ease: 'power4.out', delay: 0.15 + i * 0.1 });
    // parallax drift as the hero scrolls away
    gsap.to(p, {
      yPercent: -42 - i * 12, xPercent: (i % 2 ? 10 : -10), ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  });

  // generic reveals
  gsap.utils.toArray('.reveal').forEach(el => gsap.fromTo(el, { opacity: 0, y: 46 }, {
    opacity: 1, y: 0, duration: 1, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 84%' }
  }));

  // making heading
  gsap.from('.mhead > *', {
    opacity: 0, y: 32, duration: 1, ease: 'power3.out', stagger: 0.12,
    scrollTrigger: { trigger: '.making', start: 'top 72%' }
  });

  // THE GALLERY — process shots cascade into their scattered layout on scroll (GSAP ScrollTrigger)
  const cards = gsap.utils.toArray('.gcard');
  cards.forEach(c => {
    // preserve each card's resting tilt (set on the element) while animating in
    gsap.from(c, {
      opacity: 0, yPercent: 26, scale: 0.9,
      duration: 1.1, ease: 'power3.out',
      scrollTrigger: { trigger: c, start: 'top 88%' }
    });
    // subtle parallax inside each framed image
    gsap.to(c.querySelector('img'), {
      yPercent: -8, ease: 'none',
      scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  // footer wordmark
  gsap.fromTo('.fmark', { opacity: 0, y: 46 }, {
    opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
    scrollTrigger: { trigger: '.fmark', start: 'top 90%' }
  });
}
