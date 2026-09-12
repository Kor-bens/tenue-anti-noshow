const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const KEYS = { users: "tenue.v2.users", session: "tenue.v2.session" };
const DAYS = [
  { id: 1, label: "Lun" }, { id: 2, label: "Mar" }, { id: 3, label: "Mer" },
  { id: 4, label: "Jeu" }, { id: 5, label: "Ven" }, { id: 6, label: "Sam" }, { id: 0, label: "Dim" }
];
function uid(){ return Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4); }
function euro(n){ return new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(Number(n)||0); }
function pad(n){ return String(n).padStart(2,"0"); }
function fmtDate(iso){ return new Date(iso).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"}); }
function fmtTime(iso){ const d=new Date(iso); return pad(d.getHours())+"h"+pad(d.getMinutes()); }
function slugify(s){ return String(s||"pro").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,32)||"pro"; }
function addDays(date,n){ const d=new Date(date); d.setDate(d.getDate()+n); return d; }
function loadUsers(){ try { return JSON.parse(localStorage.getItem(KEYS.users)||"[]"); } catch { return []; } }
function saveUsers(users){ localStorage.setItem(KEYS.users, JSON.stringify(users)); }
function currentUser(){ return loadUsers().find(u=>u.id===sessionStorage.getItem(KEYS.session))||null; }
function setSession(id){ sessionStorage.setItem(KEYS.session,id); }
function logout(){ sessionStorage.removeItem(KEYS.session); }
function defaultBiz(name){
  return { name:name||"Mon activite", activity:"Coaching", city:"", phone:"",
    depositType:"fixed", depositValue:20, cancelHours:24, workDays:[1,2,3,4,5],
    startHour:9, endHour:18, slotMinutes:60,
    reminders:{h48:true,h24:true,h2:true},
    policy:"Un acompte confirme le rendez-vous. Absence ou annulation hors delai : l'acompte est conserve.",
    services:[{id:"s1",name:"Seance 60 min",duration:60,price:70}] };
}
function uniqueSlug(base, users, exceptId){
  let slug=slugify(base), i=2;
  const taken=s=>users.some(u=>u.slug===s && u.id!==exceptId);
  while(taken(slug)) slug=slugify(base)+"-"+i++;
  return slug;
}
function depositAmount(biz, price){
  return biz.depositType==="percent" ? Math.round(price*(Number(biz.depositValue)/100)*100)/100 : Number(biz.depositValue);
}
function generateSlots(biz, bookings, dayDate, duration){
  if(!biz.workDays.includes(dayDate.getDay())) return [];
  const start=new Date(dayDate); start.setHours(Number(biz.startHour),0,0,0);
  const end=new Date(dayDate); end.setHours(Number(biz.endHour),0,0,0);
  const slots=[];
  for(let t=start.getTime(); t+duration*60000<=end.getTime(); t+=Number(biz.slotMinutes)*60000){
    const from=new Date(t), to=new Date(t+duration*60000);
    if(from<new Date()) continue;
    const taken=(bookings||[]).some(b=>{
      if(b.status==="cancelled") return false;
      const bf=new Date(b.start).getTime(), bt=bf+b.duration*60000;
      return bf<to.getTime() && bt>from.getTime();
    });
    if(!taken) slots.push(from.toISOString());
  }
  return slots;
}
function parseHash(){
  const parts=location.hash.replace(/^#/,"").split("/").filter(Boolean);
  return { parts, path:parts[0]||"", id:parts[1]||"" };
}
function publicLink(slug){ return location.origin+location.pathname+"#/b/"+slug; }
function shell(inner, opts={}){
  const user=currentUser();
  const right = opts.nav || (user
    ? '<a class="btn btn-ghost" href="#/app">Agenda</a><a class="btn btn-ghost" href="#/app/reglages">Reglages</a><button class="btn btn-ghost" id="logout-btn">Sortir</button>'
    : '<a class="btn btn-ghost" href="#/login">Connexion</a><a class="btn btn-primary" href="#/signup">Creer mon espace</a>');
  return '<header class="topbar"><div class="wrap topbar-inner"><a class="brand" href="#/"><span class="mark">T</span> Tenue</a><nav class="nav">'+right+'</nav></div></header>'+inner+'<footer class="footer"><div class="wrap">Tenue — chaque pro a son lien client. Demo locale.</div></footer>';
}
function bindLogout(){ const btn=$("#logout-btn"); if(btn) btn.onclick=()=>{ logout(); location.hash="#/"; }; }
function renderLanding(){
  document.getElementById("app").innerHTML=shell('<section class="wrap hero"><div><div class="kicker">Pour les independants</div><h1>Ton agenda. Ton acompte. Tes regles.</h1><p class="lead">Inscris-toi, regle prestations, jours, creneaux et rappels. Tes clients reservent sur ton lien.</p><div class="hero-actions"><a class="btn btn-clay" href="#/signup">Creer mon espace pro</a><a class="btn btn-ghost" href="#/login">J\'ai deja un compte</a></div></div><div class="card phone"><div class="phone-bar"><span>Lien client</span><span>#/b/toi</span></div><div class="slot-list"><div class="slot"><div><strong>Acompte</strong><div class="muted">20 € ou 30 %</div></div><span class="tag">bloque</span></div><div class="slot"><div><strong>Creneaux</strong><div class="muted">Lun-Ven 9h-18h</div></div><span class="tag gold">auto</span></div><div class="slot"><div><strong>Rappels</strong><div class="muted">J-2, J-1, H-2</div></div><span class="tag">SMS pret</span></div></div></div></section>');
}
function renderAuth(mode){
  const signup=mode==="signup";
  document.getElementById("app").innerHTML=shell('<form class="panel login" id="auth"><div class="kicker">'+(signup?"Nouveau compte":"Connexion")+'</div><h2 style="margin:8px 0 12px">'+(signup?"Creer mon espace":"Acceder a mon agenda")+'</h2>'+(signup?'<label>Nom de l\'activite</label><input id="biz" required placeholder="Studio Lina">':'')+'<label>Email</label><input id="email" type="email" required><label>Mot de passe</label><input id="pass" type="password" required minlength="4"><button class="btn btn-primary" style="margin-top:14px" type="submit">'+(signup?"Creer l'espace":"Connexion")+'</button><p class="muted" style="margin-top:12px">'+(signup?'Deja inscrit ? <a href="#/login">Connexion</a>':'Pas de compte ? <a href="#/signup">Inscription</a>')+'</p></form>');
  $("#auth").onsubmit=e=>{
    e.preventDefault();
    const email=$("#email").value.trim().toLowerCase();
    const pass=$("#pass").value;
    const users=loadUsers();
    if(signup){
      if(users.some(u=>u.email===email)) return alert("Cet email a deja un compte.");
      const name=$("#biz").value.trim();
      const user={ id:uid(), email, pass, slug:uniqueSlug(name,users), biz:defaultBiz(name), bookings:[], createdAt:new Date().toISOString() };
      users.push(user); saveUsers(users); setSession(user.id); location.hash="#/app/reglages";
    } else {
      const user=users.find(u=>u.email===email && u.pass===pass);
      if(!user) return alert("Email ou mot de passe incorrect.");
      setSession(user.id); location.hash="#/app";
    }
  };
}
function requireUser(){ const u=currentUser(); if(!u){ location.hash="#/login"; return null; } return u; }
function updateUser(fn){ const users=loadUsers(); const i=users.findIndex(u=>u.id===currentUser().id); fn(users[i]); saveUsers(users); return users[i]; }
function renderAgenda(){
  const u=requireUser(); if(!u) return;
  const list=[...(u.bookings||[])].sort((a,b)=>new Date(a.start)-new Date(b.start));
  const upcoming=list.filter(b=>new Date(b.start)>new Date() && b.status==="confirmed");
  const noshow=list.filter(b=>b.status==="noshow");
  const kept=noshow.reduce((s,b)=>s+Number(b.deposit),0);
  const rows=list.length?list.map(b=>{
    const tag=b.status==="noshow"?"tag bad":b.status==="cancelled"?"tag warn":"tag";
    const label={confirmed:"Confirme",done:"Present",noshow:"No-show",cancelled:"Annule"}[b.status];
    return '<tr><td>'+fmtDate(b.start)+'<br><strong>'+fmtTime(b.start)+'</strong></td><td>'+b.name+'<br><span class="muted">'+b.phone+'</span></td><td>'+b.serviceName+'</td><td>'+euro(b.deposit)+'</td><td><span class="'+tag+'">'+label+'</span></td><td class="actions"><button class="btn btn-sm btn-ok" data-act="done" data-id="'+b.id+'">Present</button><button class="btn btn-sm btn-bad" data-act="noshow" data-id="'+b.id+'">No-show</button><button class="btn btn-sm btn-ghost" data-act="cancelled" data-id="'+b.id+'">Annuler</button></td></tr>';
  }).join(""):'<tr><td colspan="6" class="muted">Aucun rendez-vous. Partage ton lien client.</td></tr>';
  document.getElementById("app").innerHTML=shell('<div class="wrap" style="padding:28px 0 64px"><div class="notice" style="margin-bottom:14px">Lien client : <strong id="share">'+publicLink(u.slug)+'</strong> <button class="btn btn-sm btn-primary" id="copy-link">Copier</button></div><div class="kpi"><div class="panel"><span class="muted">A venir</span><b>'+upcoming.length+'</b></div><div class="panel"><span class="muted">No-shows</span><b>'+noshow.length+'</b></div><div class="panel"><span class="muted">Acomptes gardes</span><b>'+euro(kept)+'</b></div><div class="panel"><span class="muted">Acompte</span><b>'+(u.biz.depositType==="percent"?u.biz.depositValue+"%":euro(u.biz.depositValue))+'</b></div></div><div class="panel" style="margin-bottom:14px"><h3>Rappels a envoyer</h3><p class="muted" style="margin:6px 0 10px">En demo tu copies le SMS.</p><div id="reminders"></div></div><div class="panel"><h3>Agenda</h3><div style="overflow:auto;margin-top:10px"><table class="table"><thead><tr><th>Quand</th><th>Client</th><th>Prestation</th><th>Acompte</th><th>Statut</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></div></div>');
  bindLogout();
  $("#copy-link").onclick=()=>{ navigator.clipboard.writeText(publicLink(u.slug)); $("#copy-link").textContent="Copie"; };
  const hours=[]; if(u.biz.reminders.h48) hours.push(48); if(u.biz.reminders.h24) hours.push(24); if(u.biz.reminders.h2) hours.push(2);
  const due=upcoming.flatMap(b=>hours.map(h=>({b,h,when:new Date(new Date(b.start).getTime()-h*3600000),text:"Bonjour "+b.name.split(" ")[0]+", rappel : "+b.serviceName+" le "+fmtDate(b.start)+" a "+fmtTime(b.start)+" chez "+u.biz.name+". Acompte "+euro(b.deposit)+" deja regle."}))).filter(x=>x.when>new Date() && x.when-new Date()<72*3600000);
  $("#reminders").innerHTML=due.length?due.map(x=>'<div class="slot" style="margin-bottom:8px"><div><strong>'+x.b.name+'</strong> · '+(x.h>=24?("J-"+x.h/24):("H-"+x.h))+'<div class="muted">'+x.text+'</div></div><button class="btn btn-sm btn-primary copy" data-text="'+encodeURIComponent(x.text)+'">Copier SMS</button></div>').join(""):'<p class="muted">Aucun rappel imminent.</p>';
  $$(".copy").forEach(btn=>{ btn.onclick=()=>{ navigator.clipboard.writeText(decodeURIComponent(btn.dataset.text)); btn.textContent="Copie"; }; });
  $$("[data-act]").forEach(btn=>{ btn.onclick=()=>{ updateUser(user=>{ const item=user.bookings.find(x=>x.id===btn.dataset.id); if(item) item.status=btn.dataset.act; }); renderAgenda(); }; });
}
function renderSettings(){
  const u=requireUser(); if(!u) return;
  const b=u.biz;
  const days=DAYS.map(d=>'<label style="display:flex;gap:6px;align-items:center;margin:0"><input type="checkbox" name="day" value="'+d.id+'" '+(b.workDays.includes(d.id)?"checked":"")+' style="width:auto"> '+d.label+'</label>').join("");
  const services=b.services.map(s=>s.name+" | "+s.duration+" | "+s.price).join("\n");
  document.getElementById("app").innerHTML=shell('<form class="wrap panel" id="set" style="margin:28px auto 64px;max-width:800px"><div class="kicker">Reglages</div><h2>Ta page client</h2><p class="muted">Slug : <strong>'+u.slug+'</strong></p><div class="row"><div><label>Nom affiche</label><input name="name" value="'+b.name+'" required></div><div><label>Activite</label><input name="activity" value="'+b.activity+'"></div></div><div class="row"><div><label>Ville</label><input name="city" value="'+(b.city||"")+'"></div><div><label>Telephone</label><input name="phone" value="'+(b.phone||"")+'"></div></div><h3 style="margin-top:18px">Acompte</h3><div class="row"><div><label>Type</label><select name="depositType"><option value="fixed" '+(b.depositType==="fixed"?"selected":"")+'>Montant fixe €</option><option value="percent" '+(b.depositType==="percent"?"selected":"")+'>Pourcentage</option></select></div><div><label>Valeur</label><input name="depositValue" type="number" min="1" value="'+b.depositValue+'"></div></div><label>Annulation gratuite (heures)</label><input name="cancelHours" type="number" min="1" value="'+b.cancelHours+'"><h3 style="margin-top:18px">Creneaux</h3><label>Jours ouverts</label><div class="nav" style="margin-bottom:8px">'+days+'</div><div class="row"><div><label>Debut</label><input name="startHour" type="number" min="6" max="22" value="'+b.startHour+'"></div><div><label>Fin</label><input name="endHour" type="number" min="7" max="23" value="'+b.endHour+'"></div></div><label>Pas entre creneaux (min)</label><input name="slotMinutes" type="number" min="15" step="15" value="'+b.slotMinutes+'"><h3 style="margin-top:18px">Rappels</h3><label style="font-weight:500"><input type="checkbox" id="r48" '+(b.reminders.h48?"checked":"")+' style="width:auto"> 48 h avant</label><label style="font-weight:500"><input type="checkbox" id="r24" '+(b.reminders.h24?"checked":"")+' style="width:auto"> 24 h avant</label><label style="font-weight:500"><input type="checkbox" id="r2" '+(b.reminders.h2?"checked":"")+' style="width:auto"> 2 h avant</label><label>Conditions client</label><textarea name="policy">'+b.policy+'</textarea><label>Prestations (nom | minutes | prix)</label><textarea name="services">'+services+'</textarea><div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn btn-primary" type="submit">Enregistrer</button><a class="btn btn-ghost" href="#/app">Agenda</a><a class="btn btn-clay" href="#/b/'+u.slug+'">Voir page client</a></div></form>');
  bindLogout();
  $("#set").onsubmit=e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    updateUser(user=>{
      const workDays=$$('input[name="day"]:checked').map(x=>Number(x.value));
      user.biz={...user.biz, name:fd.get("name"), activity:fd.get("activity"), city:fd.get("city"), phone:fd.get("phone"),
        depositType:fd.get("depositType"), depositValue:Number(fd.get("depositValue")), cancelHours:Number(fd.get("cancelHours")),
        startHour:Number(fd.get("startHour")), endHour:Number(fd.get("endHour")), slotMinutes:Number(fd.get("slotMinutes")),
        workDays:workDays.length?workDays:[1,2,3,4,5],
        reminders:{h48:$("#r48").checked,h24:$("#r24").checked,h2:$("#r2").checked},
        policy:fd.get("policy"),
        services:String(fd.get("services")).split("\n").map((line,i)=>{
          const p=line.split("|").map(x=>(x||"").trim());
          if(!p[0]) return null;
          return {id:"s"+(i+1), name:p[0], duration:Number(p[1]||60), price:Number(p[2]||0)};
        }).filter(Boolean)
      };
      user.slug=uniqueSlug(user.biz.name, loadUsers(), user.id);
    });
    alert("Reglages enregistres.");
    location.hash="#/app";
  };
}
function renderPublic(slug){
  const pro=loadUsers().find(u=>u.slug===slug);
  if(!pro){ document.getElementById("app").innerHTML=shell('<div class="wrap section"><p>Cette page pro n\'existe pas.</p></div>'); return; }
  const biz=pro.biz;
  document.getElementById("app").innerHTML=shell('<div class="wrap layout"><aside class="panel"><div class="kicker">'+(biz.city||"Reservation")+'</div><h2 style="margin:6px 0 8px">'+biz.name+'</h2><p class="muted">'+biz.activity+'</p><p style="margin-top:14px">'+biz.policy+'</p><p class="muted" style="margin-top:12px">Annulation gratuite jusqu\'a '+biz.cancelHours+'h avant.</p></aside><form class="panel" id="book-form"><h2>Reserver</h2><label>Prestation</label><select id="service">'+biz.services.map(s=>'<option value="'+s.id+'">'+s.name+' — '+s.duration+' min — '+euro(s.price)+'</option>').join("")+'</select><div class="row"><div><label>Jour</label><input type="date" id="day" required></div><div><label>Creneau</label><select id="slot"></select></div></div><div class="row"><div><label>Nom</label><input id="name" required></div><div><label>Telephone</label><input id="phone" required></div></div><label>Email</label><input id="email" type="email" required><div class="pricebox" id="pricebox"></div><button class="btn btn-clay" style="margin-top:14px" type="submit">Payer l\'acompte et confirmer</button><p class="muted" style="margin-top:8px">Demo : paiement simule.</p></form></div>', {nav:'<a class="btn btn-ghost" href="#/">Tenue</a>'});
  const day=$("#day"); const t=addDays(new Date(),1);
  day.min=new Date().toISOString().slice(0,10); day.value=t.toISOString().slice(0,10);
  const refresh=()=>{
    const service=biz.services.find(x=>x.id===$("#service").value);
    const slots=generateSlots(biz, pro.bookings||[], new Date(day.value+"T00:00:00"), service.duration);
    $("#slot").innerHTML=slots.length?slots.map(iso=>'<option value="'+iso+'">'+fmtTime(iso)+'</option>').join(""):'<option value="">Aucun creneau ce jour</option>';
    const dep=depositAmount(biz, service.price);
    $("#pricebox").innerHTML='<div class="muted">Acompte maintenant</div><div class="big">'+euro(dep)+'</div><div>Solde '+euro(service.price-dep)+' sur place</div>';
  };
  $("#service").onchange=refresh; day.onchange=refresh; refresh();
  $("#book-form").onsubmit=e=>{
    e.preventDefault();
    const service=biz.services.find(x=>x.id===$("#service").value);
    const start=$("#slot").value; if(!start) return alert("Choisis un creneau.");
    const booking={ id:uid(), serviceId:service.id, serviceName:service.name, duration:service.duration, price:service.price, deposit:depositAmount(biz,service.price), start, name:$("#name").value.trim(), email:$("#email").value.trim(), phone:$("#phone").value.trim(), status:"confirmed", paid:true, createdAt:new Date().toISOString() };
    const users=loadUsers(); const i=users.findIndex(x=>x.id===pro.id);
    users[i].bookings=users[i].bookings||[]; users[i].bookings.push(booking); saveUsers(users);
    location.hash="#/ok/"+pro.slug+"/"+booking.id;
  };
}
function renderOk(slug,id){
  const pro=loadUsers().find(u=>u.slug===slug);
  const b=pro&&pro.bookings&&pro.bookings.find(x=>x.id===id);
  document.getElementById("app").innerHTML=shell(b?'<div class="wrap" style="max-width:640px;padding:40px 0"><div class="panel"><div class="okbox">Acompte '+euro(b.deposit)+' encaisse. Rendez-vous confirme.</div><h2 style="margin-top:12px">'+b.serviceName+'</h2><p><strong>'+fmtDate(b.start)+'</strong> a <strong>'+fmtTime(b.start)+'</strong></p><p class="muted">'+pro.biz.name+'</p></div></div>':'<div class="wrap section">Reservation introuvable.</div>', {nav:'<a class="btn btn-ghost" href="#/b/'+slug+'">Nouvelle reservation</a>'});
}
function route(){
  const {parts,path,id}=parseHash();
  if(!path) return renderLanding();
  if(path==="signup") return renderAuth("signup");
  if(path==="login") return renderAuth("login");
  if(path==="app" && parts[1]==="reglages") return renderSettings();
  if(path==="app") return renderAgenda();
  if(path==="b") return renderPublic(id);
  if(path==="ok") return renderOk(parts[1], parts[2]);
  renderLanding();
}
window.addEventListener("hashchange", route);
route();
