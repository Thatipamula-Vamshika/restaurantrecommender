// help.js - small script to render FAQ items (mirrors original React data)
(function(){
  const FAQ = [
    { q: "Do I need to sign up?", a: "Never. CommunalTable is completely anonymous — no email, no account." },
    { q: "How are budgets combined?", a: "We use the lowest cap in the group so nobody is forced to overspend." },
    { q: "What if someone has a severe allergy?", a: "Any allergy from any member excludes risky restaurants for the whole group." },
    { q: "What if the group has very different tastes?", a: "We still suggest highly-rated nearby places that aren't ruled out by allergies." },
    { q: "Where does the data come from?", a: "A public Swiggy restaurant catalog of 60K+ Indian restaurants. Menus shown are indicative." },
  ];

  const container = document.getElementById('faq-list');
  if(!container) return;

  FAQ.forEach(function(f){
    const d = document.createElement('details');
    d.className = 'rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]';

    const s = document.createElement('summary');
    s.className = 'cursor-pointer font-semibold';
    s.textContent = f.q;

    const p = document.createElement('p');
    p.className = 'mt-2 text-foreground/80';
    p.textContent = f.a;

    d.appendChild(s);
    d.appendChild(p);
    container.appendChild(d);
  });
})();
