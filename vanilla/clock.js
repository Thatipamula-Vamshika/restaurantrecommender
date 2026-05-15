// clock.js - multi-timezone digital clock with simple UI and localStorage persistence
(function(){
  const DEFAULT_ZONES = [
    'UTC',
    'America/New_York',
    'Europe/London',
    'Asia/Kolkata',
    'Asia/Tokyo',
    'Australia/Sydney'
  ];

  const tzSelect = document.getElementById('tz-select');
  const clocksContainer = document.getElementById('clocks');
  const addBtn = document.getElementById('add-btn');
  const clearBtn = document.getElementById('clear-btn');

  // Build timezone options (IANA list limited to a common subset)
  const COMMON_TIMEZONES = DEFAULT_ZONES;

  function populateSelect(){
    tzSelect.innerHTML = '';
    COMMON_TIMEZONES.forEach(tz=>{
      const opt = document.createElement('option');
      opt.value = tz;
      opt.textContent = tz.replace('_',' ');
      tzSelect.appendChild(opt);
    });
  }

  // persistence
  function loadZones(){
    try{
      const raw = localStorage.getItem('worldclock.zones');
      if(!raw) return ['UTC','Asia/Kolkata'];
      const parsed = JSON.parse(raw);
      if(Array.isArray(parsed) && parsed.length) return parsed;
    }catch(e){/* ignore */}
    return ['UTC','Asia/Kolkata'];
  }

  function saveZones(zones){
    localStorage.setItem('worldclock.zones', JSON.stringify(zones));
  }

  let zones = loadZones();

  function formatForTimeZone(date, timeZone){
    const timeFmt = new Intl.DateTimeFormat([], {
      hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: false, timeZone
    });
    const dateFmt = new Intl.DateTimeFormat([], { year:'numeric', month:'short', day:'numeric', timeZone });
    return { time: timeFmt.format(date), date: dateFmt.format(date) };
  }

  function createClockCard(tz){
    const card = document.createElement('div');
    card.className = 'clock-card';
    card.setAttribute('data-tz', tz);

    const hdr = document.createElement('div');
    hdr.className = 'flex items-center justify-between gap-2';

    const zone = document.createElement('div');
    zone.className = 'clock-zone';
    zone.textContent = tz.replace('_',' ');

    const rem = document.createElement('button');
    rem.className = 'text-xs';
    rem.textContent = 'Remove';
    rem.addEventListener('click', ()=>{
      zones = zones.filter(z=>z!==tz);
      saveZones(zones);
      renderClocks();
    });

    hdr.appendChild(zone);
    hdr.appendChild(rem);

    const timeEl = document.createElement('div');
    timeEl.className = 'clock-time';
    timeEl.textContent = '--:--:--';

    const dateEl = document.createElement('div');
    dateEl.className = 'text-muted-foreground';
    dateEl.textContent = '';

    card.appendChild(hdr);
    card.appendChild(timeEl);
    card.appendChild(dateEl);

    return { card, timeEl, dateEl };
  }

  function renderClocks(){
    clocksContainer.innerHTML = '';
    zones.forEach(tz=>{
      const { card, timeEl, dateEl } = createClockCard(tz);
      clocksContainer.appendChild(card);
      // attach nodes for update loop
      clockNodes.push({ tz, timeEl, dateEl });
    });
  }

  populateSelect();

  addBtn.addEventListener('click', ()=>{
    const tz = tzSelect.value;
    if(!tz) return;
    if(zones.includes(tz)) return;
    zones.push(tz);
    saveZones(zones);
    refresh();
  });

  clearBtn.addEventListener('click', ()=>{
    zones = [];
    saveZones(zones);
    refresh();
  });

  // update loop
  const clockNodes = [];

  function updateClocks(){
    const now = new Date();
    clockNodes.forEach(node=>{
      try{
        const f = formatForTimeZone(now, node.tz);
        node.timeEl.textContent = f.time;
        node.dateEl.textContent = f.date;
      }catch(e){
        node.timeEl.textContent = '—';
        node.dateEl.textContent = 'Invalid TZ';
      }
    });
  }

  function refresh(){
    clockNodes.length = 0; // clear existing references
    renderClocks();
    updateClocks();
  }

  // initialize zones from storage
  zones = zones && zones.length ? zones : ['UTC','Asia/Kolkata'];
  refresh();
  // tick every second
  setInterval(updateClocks, 1000);
})();
