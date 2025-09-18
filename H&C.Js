// Minimal interactions for words-only template
(function(){
  const modal = document.getElementById('modal');
  const sticky = document.getElementById('sticky');
  const lead = document.getElementById('lead');
  const menuBtn = document.getElementById('menu-btn');
  const siteNav = document.getElementById('site-nav');
  const bar = document.querySelector('.bar');

  // Timed modal (lead capture)
  setTimeout(()=>{ try{ modal?.showModal(); }catch(_){ /* no dialog support */ } }, 6000);

  // Close modal via X
  document.querySelector('.panel .x')?.addEventListener('click', ()=>{
    try{ modal?.close(); }catch(_){ }
  });

  // Lead form message
  lead?.addEventListener('submit', (e)=>{
    e.preventDefault();
    alert('Thanks! We will respond within 48 hours.');
    try{ modal?.close(); }catch(_){ }
  });

  // Hide sticky bar when booking CTA clicked
  sticky?.addEventListener('click', (e)=>{
    if(e.target.closest('a')) sticky.style.display = 'none';
  });

  // Mobile nav dropdown
  function setMenu(open){
    if(!menuBtn || !siteNav) return;
    menuBtn.setAttribute('aria-expanded', String(open));
    siteNav.classList.toggle('open', open);
  }
  menuBtn?.addEventListener('click', ()=>{
    const open = menuBtn.getAttribute('aria-expanded') !== 'true';
    setMenu(open);
  });
  // Close on escape
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape') setMenu(false);
  });
  // Close when a nav link is clicked
  siteNav?.addEventListener('click', (e)=>{
    const a = e.target.closest('a');
    if(a) setMenu(false);
  });
  // Close when clicking outside the nav
  document.addEventListener('click', (e)=>{
    if(!menuBtn || !siteNav) return;
    const within = e.target === menuBtn || menuBtn.contains(e.target) || siteNav.contains(e.target);
    if(!within) setMenu(false);
  }, { capture:true });

  // Set CSS var for header height (for anchor offset)
  function setHeaderVar(){
    if(!bar) return;
    const h = bar.offsetHeight || 68;
    document.documentElement.style.setProperty('--header-h', h + 'px');
  }
  setHeaderVar();
  window.addEventListener('resize', setHeaderVar);

  // Reveal on scroll for sections
  const reveals = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window && reveals.length){
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(el=> io.observe(el));
  }else{
    // Fallback
    reveals.forEach(el=> el.classList.add('in'));
  }

  // Scroll spy for nav active state
  const sections = Array.from(document.querySelectorAll('main > section[id]'));
  const navLinks = Array.from(siteNav?.querySelectorAll('a[href^="#"]') || []);
  const byId = Object.fromEntries(navLinks.map(a=>[a.getAttribute('href').slice(1), a]));
  if('IntersectionObserver' in window && sections.length){
    const spy = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          const id = e.target.id;
          navLinks.forEach(a=> { a.classList.remove('active'); a.removeAttribute('aria-current'); });
          byId[id]?.classList.add('active');
          byId[id]?.setAttribute('aria-current','page');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0.01 });
    sections.forEach(s=> spy.observe(s));
  }
})();
