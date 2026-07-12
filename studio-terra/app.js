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
  // HERO title entrance
  gsap.fromTo('.hcenter > *', { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12, delay: 0.35 });

  // HERO props — entrance, continuous idle float (always alive), and scroll drift
  const props = gsap.utils.toArray('.prop');
  props.forEach((p, i) => {
    gsap.fromTo(p, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 1.2, ease: 'power4.out', delay: 0.12 + i * 0.07 });
    // gentle forever-float, each prop with its own rhythm
    gsap.to(p, {
      y: gsap.utils.random(-18, -9), duration: gsap.utils.random(2.6, 4.4),
      yoyo: true, repeat: -1, ease: 'sine.inOut', delay: gsap.utils.random(0, 1.4)
    });
    // parallax drift as the hero scrolls away
    gsap.to(p, {
      yPercent: -38 - i * 6, xPercent: (i % 2 ? 9 : -9), ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  });

  // section reveals — reversible, so scrolling back up then down replays them
  gsap.utils.toArray('.reveal').forEach(el => gsap.fromTo(el, { opacity: 0, y: 46 }, {
    opacity: 1, y: 0, duration: 1, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' }
  }));

  // making heading — reversible
  gsap.fromTo('.mhead > *', { opacity: 0, y: 32 }, {
    opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.12,
    scrollTrigger: { trigger: '.making', start: 'top 74%', toggleActions: 'play none none reverse' }
  });

  // THE ZIG-ZAG GALLERY — cards slide in from alternating sides, scrubbed by scroll (reverses on scroll-up)
  gsap.utils.toArray('.gcard').forEach(c => {
    const dir = c.classList.contains('g-l') ? -1 : c.classList.contains('g-r') ? 1 : 0;
    gsap.fromTo(c,
      { opacity: 0, x: dir * 130, y: 70, scale: 0.9 },
      { opacity: 1, x: 0, y: 0, scale: 1, ease: 'power2.out',
        scrollTrigger: { trigger: c, start: 'top 94%', end: 'top 56%', scrub: 0.6 } });
    // subtle parallax inside each framed image
    gsap.to(c.querySelector('img'), {
      yPercent: -8, ease: 'none',
      scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  // footer wordmark — reversible
  gsap.fromTo('.fmark', { opacity: 0, y: 46 }, {
    opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
    scrollTrigger: { trigger: '.fmark', start: 'top 92%', toggleActions: 'play none none reverse' }
  });
}
