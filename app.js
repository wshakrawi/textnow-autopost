const state = {
  groups:[
    {name:'Rumah Sewa Bangi',area:'Bangi',type:'rental',last:'Yesterday',members:'42K'},
    {name:'Rumah Sewa Kajang & Bangi',area:'Kajang',type:'rental',last:'3 days ago',members:'67K'},
    {name:'Property Malaysia - Direct Owner',area:'Malaysia',type:'subsale',last:'5 days ago',members:'118K'},
    {name:'Bilik Sewa Cyberjaya & Putrajaya',area:'Cyberjaya',type:'room',last:'1 week ago',members:'31K'},
    {name:'Tanah Untuk Dijual Selangor',area:'Selangor',type:'land',last:'2 weeks ago',members:'24K'},
    {name:'Rumah Sewa Seri Kembangan',area:'Seri Kembangan',type:'rental',last:'4 days ago',members:'53K'}
  ],
  posts:[
    {listing:'Vista Seri Putra',groups:5,time:'09:00 AM',day:'Today',status:'Ready',progress:'0/5'},
    {listing:'Suites @ Edusentral',groups:6,time:'01:00 PM',day:'Today',status:'Scheduled',progress:'0/6'},
    {listing:'Adelia 2 Bangi',groups:8,time:'08:00 PM',day:'Today',status:'Scheduled',progress:'0/8'},
    {listing:'Tulip Residence Denai Alam',groups:4,time:'09:30 AM',day:'Tomorrow',status:'Needs action',progress:'2/4'}
  ]
};

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const toast = msg => { const t=$('#toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); };

function setView(name){
  $$('.view').forEach(v=>v.classList.remove('active'));
  $$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===name));
  const target=$('#view-'+name) || $('#view-overview'); target.classList.add('active');
  if(name==='create'){ openComposer(); setView('overview'); }
  $('#sidebar').classList.remove('open');
}
$$('.nav-item').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$$('[data-view-link]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.viewLink)));
$('#menuBtn').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));

function statusBadge(status){
  const c = status==='Posted'?'posted':status==='Ready'?'ready':status==='Needs action'?'action':'scheduled';
  return `<span class="badge ${c}">${status}</span>`;
}
function renderPosts(){
  $('#upcomingList').innerHTML=state.posts.slice(0,3).map(p=>`<div class="upcoming-item"><div class="time-box"><strong>${p.time.split(' ')[0]}</strong><small>${p.time.includes('PM')?'PM':'AM'}</small></div><div><h3>${p.listing}</h3><p>${p.groups} Facebook Groups · ${p.day}</p></div>${statusBadge(p.status)}</div>`).join('');
  $('#recentTable').innerHTML=state.posts.map(p=>`<tr><td><strong>${p.listing}</strong></td><td>${p.groups} groups</td><td>${p.day}, ${p.time}</td><td>${statusBadge(p.status)}</td><td><button class="kebab">•••</button></td></tr>`).join('');
  $('#queueTable').innerHTML=state.posts.map(p=>`<tr><td><strong>${p.listing}</strong></td><td>${p.groups}</td><td>${p.day}<br><span class="muted">${p.time}</span></td><td>${p.progress}</td><td>${statusBadge(p.status)}</td><td><button class="kebab">•••</button></td></tr>`).join('');
  const days=['Today','Tomorrow','Wednesday'];
  $('#scheduleGrid').innerHTML=days.map(d=>`<div class="day-card"><h3>${d}</h3>${state.posts.filter(p=>p.day===d).map(p=>`<div class="schedule-post"><strong>${p.time} · ${p.listing}</strong><small>${p.groups} groups · ${p.status}</small></div>`).join('') || '<p class="muted">No posts scheduled.</p>'}</div>`).join('');
}

let activeFilter='all';
function renderGroups(){
  const q=($('#groupSearch')?.value||'').toLowerCase();
  const list=state.groups.filter(g=>(activeFilter==='all'||g.type===activeFilter) && (g.name.toLowerCase().includes(q)||g.area.toLowerCase().includes(q)));
  $('#groupCount').textContent=list.length;
  $('#groupCards').innerHTML=list.map((g,i)=>`<article class="group-card"><div class="group-top"><div><h3>${g.name}</h3><p>${g.area} · ${g.members} members</p></div><button class="kebab">•••</button></div><div class="meta-row"><span class="tag">${g.type}</span><span class="tag">Last post: ${g.last}</span></div></article>`).join('');
  $('#groupSets').innerHTML=[['Bangi Rental',18],['Kajang Rental',23],['KL Rental',31],['Subsale Selangor',42]].map(s=>`<div class="set-card"><div><strong>${s[0]}</strong><small>${s[1]} groups</small></div><span>›</span></div>`).join('');
  $('#targetGroups').innerHTML=state.groups.slice(0,6).map((g,i)=>`<label class="target-option"><input type="checkbox" ${i<3?'checked':''}><span><strong>${g.name}</strong><small>${g.area} · ${g.type}</small></span></label>`).join('');
}
$('#groupSearch').addEventListener('input',renderGroups);
$$('#groupFilters .chip').forEach(c=>c.addEventListener('click',()=>{ activeFilter=c.dataset.filter; $$('#groupFilters .chip').forEach(x=>x.classList.remove('active')); c.classList.add('active'); renderGroups(); }));
$('#addGroupBtn').addEventListener('click',()=>{ state.groups.unshift({name:'New Facebook Group',area:'Selangor',type:'rental',last:'Never',members:'—'}); renderGroups(); toast('New group added to library'); });

const modal=$('#composerModal');
function openComposer(){ modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); syncPreview(); }
function closeComposer(){ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); }
$$('[data-open-composer]').forEach(b=>b.addEventListener('click',openComposer));
$('#closeComposer').addEventListener('click',closeComposer);
modal.addEventListener('click',e=>{ if(e.target===modal) closeComposer(); });
$('#captionInput').addEventListener('input',syncPreview);
function syncPreview(){ $('#previewCaption').textContent=$('#captionInput').value; }
$('#photoGrid').innerHTML=Array.from({length:6},(_,i)=>`<div class="photo selected">Photo ${i+1}</div>`).join('');
$('#selectAllGroups').addEventListener('click',()=>$$('#targetGroups input').forEach(i=>i.checked=true));
$('#saveDraftBtn').addEventListener('click',()=>toast('Draft saved locally'));
$('#scheduleBtn').addEventListener('click',()=>{ toast('Post scheduled'); closeComposer(); });
$('#addQueueBtn').addEventListener('click',()=>{
  const listing=$('#listingSelect').value; const selected=$$('#targetGroups input:checked').length || 1;
  state.posts.unshift({listing,groups:selected,time:'09:00 AM',day:'Tomorrow',status:'Scheduled',progress:`0/${selected}`});
  renderPosts(); closeComposer(); toast(`${listing} added to posting queue`);
});
$('#globalSearch').addEventListener('input',e=>{ const q=e.target.value.toLowerCase(); if(q.includes('group')) setView('groups'); else if(q.includes('queue')||q.includes('post')) setView('queue'); });

renderPosts(); renderGroups(); syncPreview();
