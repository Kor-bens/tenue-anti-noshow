const $= (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const STORE = { settings: 'tenue.settings', bookings: 'tenue.bookings', session: 'tenue.session' };
const DEFAULT_SETTINGS = {
  businessName: 'Studio Lina', ownerName: 'Lina Martin', activity: 'Coaching', city: 'Lyon',
  email: 'lina@studio-demo.fr', phone: '06 12 34 56 78', pin: '1234', depositType: 'fixed',
  depositValue: 20, cancelHours: 24, workDays: [1,2,3,4,5], startHour: 9, endHour: 18,
  slotMinutes: 60, reminderHours: [48,24,2],
  policy: 'Un acompte est exig\u00e9 pour confirmer le rendez-vous. Toute annulation moins de 24h avant, ou toute absence, entra\u00eene la conservation de l\'acompte.',
  services: [
    { id: 's1', name: 'S\u00e9ance d\u00e9couverte', duration: 45, price: 45 },
    { id: 's2', name: 'Coaching 60 min', duration: 60, price: 70 },
    { id: 's3', name: 'Bilan 90 min', duration: 90, price: 110 }
  ]
};
function loadSettings(){ try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORE.settings)||'{}') }; } catch { return {...DEFAULT_SETTINGS}; } }
function saveSettings(s){ localStorage.setItem(STORE.settings, JSON.stringify(s)); }
function loadBookings(){ try { return JSON.parse(localStorage.getItem(STORE.bookings)||'[]'); } catch { return []; } }
function saveBookings(list){ localStorage.setItem(STORE.bookings, JSON.stringify(list)); }
function uid(){ return Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4); }
function euro(n){ return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(n); }
function pad(n){ return String(n).padStart(2,'0'); }
function fmtDate(iso){ return new Date(iso).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}); }
function fmtTime(iso){ const d=new Date(iso); return pad(d.getHours())+'h'+pad(d.getMinutes()); }
function depositAmount(settings, price){ return settings.depositType==='percent' ? Math.round(price*(Number(settings.depositValue)/100)*100)/100 : Number(settings.depositValue); }
function addDays(date,n){ const d=new Date(date); d.setDate(d.getDate()+n); return d; }
function generateSlots(settings, bookings, dayDate, duration){
  if(!settings.workDays.includes(dayDate.getDay())) return [];
  const slots=[], start=new Date(dayDate), end=new Date(dayDate);
  start.setHours(settings.startHour,0,0,0); end.setHours(settings.endHour,0,0,0);
  for(let t=start.getTime(); t+duration*60000<=end.getTime(); t+=settings.slotMinutes*60000){
    const from=new Date(t), to=new Date(t+duration*60000);
    if(from < new Date()) continue;
    const taken=bookings.some(b=>{
      if(b.status==='cancelled') return false;
      const bf=new Date(b.start).getTime(), bt=bf+b.duration*60000;
      return bf<to.getTime() && bt>from.getTime();
    });
    if(!taken) slots.push(from.toISOString());
  }
  return slots;
}
function seedIfEmpty(){
  if(loadBookings().length) return;
  const tomorrow=addDays(new Date(),1); tomorrow.setHours(10,0,0,0);
  const later=addDays(new Date(),2); later.setHours(14,0,0,0);
  saveBookings([
    {id:uid(),serviceId:'s2',serviceName:'Coaching 60 min',duration:60,price:70,deposit:20,start:tomorrow.toISOString(),name:'Camille Durand',email:'camille@mail.fr',phone:'06 22 11 00 33',note:'',status:'confirmed',paid:true,createdAt:new Date().toISOString(),reminders:[]},
    {id:uid(),serviceId:'s1',serviceName:'S\u00e9ance d\u00e9couverte',duration:45,price:45,deposit:20,start:later.toISOString(),name:'Noah Petit',email:'noah@mail.fr',phone:'07 18 44 21 09',note:'Premier rendez-vous',status:'confirmed',paid:true,createdAt:new Date().toISOString(),reminders:[]}
  ]);
}
function route(){
  const parts=location.hash.replace('#','').split('/').filter(Boolean);
  const path=parts[0], id=parts[1];
  if(!path) return renderLanding();
  if(path==='reserver') return renderBook();
  if(path==='confirmation') return renderConfirm(id);
  if(path==='admin') return renderAdmin();
  if(path==='reglages') return renderSettings();
  return renderLanding();
}
function shell(inner, active){
  return `<header class="topbar"><div class="wrap topbar-inner"><a class="brand" href="#/"><span class="mark">T</span> Tenue</a><nav class="nav"><a class="btn btn-ghost ${active==='book'?'btn-primary':''}" href="#/reserver">R\u00e9server</a><a class="btn btn-ghost ${active==='admin'?'btn-primary':''}" href="#/admin">Espace pro</a></nav></div></header>${inner}<footer class="footer"><div class="wrap">Tenue \u2014 anti no-show. Donn\u00e9es locales dans le navigateur.</div></footer>`;
}
function renderLanding(){
  const s=loadSettings();
  document.getElementById('app').innerHTML=shell(`<section class="wrap hero"><div><div class="kicker">Micro-SaaS</div><h1>Tes clients viennent. Ou ils paient l\u2019acompte.</h1><p class="lead">R\u00e9servation, acompte, rappels, no-show.</p><div class="hero-actions"><a class="btn btn-clay" href="#/reserver">Tester la r\u00e9servation</a><a class="btn btn-primary" href="#/admin">Espace pro</a></div></div><div class="card phone"><div class="phone-bar"><span>${s.businessName}</span><span>Acompte ${euro(s.depositValue)}</span></div><div class="slot-list"><div class="slot"><div><strong>Mardi 15h00</strong><div class="muted">Coaching 60 min</div></div><span class="tag">Acompte requis</span></div></div></div></section>`, 'home');
}
function renderBook(){
  const s=loadSettings(), bookings=loadBookings();
  document.getElementById('app').innerHTML=shell(`<div class="wrap layout"><aside class="panel"><div class="kicker">${s.city}</div><h2>${s.businessName}</h2><p class="muted">${s.activity}</p><p style="margin-top:12px">${s.policy}</p></aside><form class="panel" id="book-form"><h2>R\u00e9server</h2><label>Prestation</label><select id="service">${s.services.map(sv=>`<option value="${sv.id}">${sv.name} \u2014 ${euro(sv.price)}</option>`).join('')}</select><div class="row"><div><label>Jour</label><input type="date" id="day" required></div><div><label>Cr\u00e9neau</label><select id="slot"></select></div></div><label>Nom</label><input id="name" required><label>T\u00e9l\u00e9phone</label><input id="phone" required><label>Email</label><input id="email" type="email" required><div class="pricebox" id="pricebox"></div><button class="btn btn-clay" style="margin-top:14px" type="submit">Payer l\u2019acompte et confirmer</button></form></div>`, 'book');
  const day=$('#day'); const t=addDays(new Date(),1); day.min=new Date().toISOString().slice(0,10); day.value=t.toISOString().slice(0,10);
  const refresh=()=>{ const service=s.services.find(x=>x.id===$('#service').value); const slots=generateSlots(s,bookings,new Date(day.value+'T00:00:00'),service.duration); $('#slot').innerHTML=slots.length?slots.map(iso=>`<option value="${iso}">${fmtTime(iso)}</option>`).join(''):'<option value="">Aucun cr\u00e9neau</option>'; const dep=depositAmount(s,service.price); $('#pricebox').innerHTML=`<div class="muted">Acompte</div><div class="big">${euro(dep)}</div>`; };
  $('#service').onchange=refresh; day.onchange=refresh; refresh();
  $('#book-form').onsubmit=e=>{ e.preventDefault(); const service=s.services.find(x=>x.id===$('#service').value); const start=$('#slot').value; if(!start) return alert('Choisis un cr\u00e9neau'); const booking={id:uid(),serviceId:service.id,serviceName:service.name,duration:service.duration,price:service.price,deposit:depositAmount(s,service.price),start,name:$('#name').value.trim(),email:$('#email').value.trim(),phone:$('#phone').value.trim(),note:'',status:'confirmed',paid:true,createdAt:new Date().toISOString(),reminders:[]}; const list=loadBookings(); list.push(booking); saveBookings(list); location.hash='#/confirmation/'+booking.id; };
}
function renderConfirm(id){
  const s=loadSettings(); const b=loadBookings().find(x=>x.id===id);
  document.getElementById('app').innerHTML=shell(b?`<div class="wrap" style="max-width:640px;padding:40px 0"><div class="panel"><div class="okbox">Acompte ${euro(b.deposit)} encaiss\u00e9.</div><h2>${b.serviceName}</h2><p><strong>${fmtDate(b.start)}</strong> \u00e0 <strong>${fmtTime(b.start)}</strong></p><p class="muted">${s.businessName}</p><a class="btn btn-ghost" href="#/reserver">Nouvelle r\u00e9servation</a></div></div>`:'<div class="wrap section">Introuvable</div>');
}
function loggedIn(){ return sessionStorage.getItem(STORE.session)==='ok'; }
function renderLogin(){
  document.getElementById('app').innerHTML=shell(`<form class="panel login" id="login"><h2>Code d\u2019acc\u00e8s</h2><p class="muted">D\u00e9mo : 1234</p><label>PIN</label><input id="pin" type="password"><button class="btn btn-primary" style="margin-top:14px" type="submit">Entrer</button></form>`,'admin');
  $('#login').onsubmit=e=>{ e.preventDefault(); if($('#pin').value===String(loadSettings().pin)){ sessionStorage.setItem(STORE.session,'ok'); renderAdmin(); } else alert('Code incorrect'); };
}
function renderAdmin(){
  if(!loggedIn()) return renderLogin();
  const s=loadSettings(); const list=loadBookings().sort((a,b)=>new Date(a.start)-new Date(b.start));
  const upcoming=list.filter(b=>new Date(b.start)>new Date()&&b.status==='confirmed');
  const noshow=list.filter(b=>b.status==='noshow');
  const kept=noshow.reduce((sum,b)=>sum+Number(b.deposit),0);
  document.getElementById('app').innerHTML=shell(`<div class="wrap" style="padding:28px 0"><div style="display:flex;justify-content:space-between;margin-bottom:14px"><h2>${s.businessName}</h2><div><a class="btn btn-ghost" href="#/reglages">R\u00e9glages</a></div></div><div class="kpi"><div class="panel"><span class="muted">\u00c0 venir</span><b>${upcoming.length}</b></div><div class="panel"><span class="muted">No-shows</span><b>${noshow.length}</b></div><div class="panel"><span class="muted">Acomptes gard\u00e9s</span><b>${euro(kept)}</b></div></div><div class="panel"><table class="table"><thead><tr><th>Quand</th><th>Client</th><th>Prestation</th><th>Statut</th><th></th></tr></thead><tbody>${list.map(b=>`<tr><td>${fmtDate(b.start)} ${fmtTime(b.start)}</td><td>${b.name}<br><span class="muted">${b.phone}</span></td><td>${b.serviceName}</td><td>${b.status}</td><td class="actions"><button class="btn btn-sm btn-ok" data-act="done" data-id="${b.id}">Pr\u00e9sent</button><button class="btn btn-sm btn-bad" data-act="noshow" data-id="${b.id}">No-show</button><button class="btn btn-sm btn-ghost" data-act="cancel" data-id="${b.id}">Annuler</button></td></tr>`).join('')}</tbody></table></div></div>`,'admin');
  $$('[data-act]').forEach(btn=>{ btn.onclick=()=>{ const all=loadBookings(); const item=all.find(x=>x.id===btn.dataset.id); if(!item) return; item.status=btn.dataset.act==='done'?'done':btn.dataset.act==='noshow'?'noshow':'cancelled'; saveBookings(all); renderAdmin(); }; });
}
function renderSettings(){
  if(!loggedIn()) return renderLogin();
  const s=loadSettings();
  document.getElementById('app').innerHTML=shell(`<form class="wrap panel" id="set" style="margin:28px auto;max-width:760px"><h2>R\u00e9glages</h2><label>Nom commercial</label><input name="businessName" value="${s.businessName}"><label>Activit\u00e9</label><input name="activity" value="${s.activity}"><label>Ville</label><input name="city" value="${s.city}"><label>PIN</label><input name="pin" value="${s.pin}"><button class="btn btn-primary" style="margin-top:14px" type="submit">Enregistrer</button></form>`,'admin');
  $('#set').onsubmit=e=>{ e.preventDefault(); const fd=new FormData(e.target); const next={...s}; for(const [k,v] of fd.entries()) next[k]=v; saveSettings(next); location.hash='#/admin'; };
}
seedIfEmpty(); window.addEventListener('hashchange', route); route();
