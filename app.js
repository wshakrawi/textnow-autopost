const STORAGE_KEY = 'textme_autopost_state_v2';
const BRIDGE_SOURCE = 'TEXTME_WEB_APP';
const BRIDGE_REPLY = 'TEXTME_EXTENSION_BRIDGE';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
const pad = n => String(n).padStart(2,'0');
const esc = v => String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));

function localDateTimeValue(date){
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatDateTime(value){
  if(!value) return 'Ready now';
  const d = new Date(value);
  return new Intl.DateTimeFormat('en-MY',{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}).format(d);
}
function formatTime(value){
  const d = new Date(value);
  return new Intl.DateTimeFormat('en-MY',{hour:'numeric',minute:'2-digit'}).format(d);
}
function dateKey(value){
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function todayAt(hour, minute=0, addDays=0){
  const d = new Date(); d.setDate(d.getDate()+addDays); d.setHours(hour,minute,0,0); return d.toISOString();
}

const demoState = () => ({
  version:2,
  groups:[
    {id:'g_bangi',name:'Rumah Sewa Bangi',area:'Bangi',type:'rental',url:'https://www.facebook.com/groups/',lastPostedAt:null},
    {id:'g_kajang',name:'Rumah Sewa Kajang & Bangi',area:'Kajang',type:'rental',url:'https://www.facebook.com/groups/',lastPostedAt:null},
    {id:'g_owner',name:'Property Malaysia - Direct Owner',area:'Malaysia',type:'subsale',url:'https://www.facebook.com/groups/',lastPostedAt:null},
    {id:'g_room',name:'Bilik Sewa Cyberjaya & Putrajaya',area:'Cyberjaya',type:'room',url:'https://www.facebook.com/groups/',lastPostedAt:null},
    {id:'g_land',name:'Tanah Untuk Dijual Selangor',area:'Selangor',type:'land',url:'https://www.facebook.com/groups/',lastPostedAt:null},
    {id:'g_seri',name:'Rumah Sewa Seri Kembangan',area:'Seri Kembangan',type:'rental',url:'https://www.facebook.com/groups/',lastPostedAt:null}
  ],
  posts:[
    {id:'p_vsp',listing:'Vista Seri Putra',type:'rental',caption:'FOR RENT | Vista Seri Putra\n\n3 Bedrooms • 2 Bathrooms\nStrategic location with easy access to Bangi & Kajang.\n\nInterested? WhatsApp for viewing appointment.',imageUrls:[],groupIds:['g_bangi','g_kajang','g_seri'],scheduledAt:todayAt(21,0,0),status:'scheduled',currentGroupIndex:0,completedGroupIds:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},
    {id:'p_adelia',listing:'Adelia 2 Bangi',type:'rental',caption:'FOR RENT | Adelia 2 Bangi\n\nComfortable family unit in Bangi. Contact for details and viewing.',imageUrls:[],groupIds:['g_bangi','g_kajang'],scheduledAt:todayAt(10,0,1),status:'scheduled',currentGroupIndex:0,completedGroupIds:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}
  ],
  history:[{id:uid('h'),time:new Date().toISOString(),message:'AutoPost local workspace created'}]
});

let state = loadState();
let activeFilter = 'all';
let queueFilter = 'all';
let editingPostId = null;
let editingGroupId = null;
let bridgeAvailable = false;

function loadState(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved?.version === 2 && Array.isArray(saved.groups) && Array.isArray(saved.posts)) return saved;
  }catch(e){}
  const initial = demoState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}
function saveState({sync=true}={}){
  state.version = 2;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if(sync) syncToExtension();
}
function addHistory(message){
  state.history.unshift({id:uid('h'),time:new Date().toISOString(),message});
  state.history = state.history.slice(0,200);
}
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>t.classList.remove('show'),2400); }
function getGroup(id){ return state.groups.find(g=>g.id===id); }
function normalizedStatus(post){
  if(post.status==='posted' || post.status==='action') return post.status;
  if((post.completedGroupIds||[]).length >= (post.groupIds||[]).length && post.groupIds?.length){ post.status='posted'; return 'posted'; }
  if(!post.scheduledAt || new Date(post.scheduledAt).getTime() <= Date.now()){ post.status='ready'; return 'ready'; }
  post.status='scheduled'; return 'scheduled';
}
function refreshStatuses(){ state.posts.forEach(normalizedStatus); saveState({sync:false}); }
function statusLabel(status){ return ({scheduled:'Scheduled',ready:'Ready',posted:'Posted',action:'Needs action',draft:'Draft'})[status]||status; }
function statusBadge(status){ return `<span class="badge ${esc(status)}">${esc(statusLabel(status))}</span>`; }

function setView(name){
  $$('.view').forEach(v=>v.classList.remove('active'));
  $$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===name));
  if(name==='create'){ openComposer(); name='overview'; $$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===name)); }
  ($('#view-'+name)||$('#view-overview')).classList.add('active');
  $('#sidebar').classList.remove('open');
  renderAll();
}

function renderStats(){
  refreshStatuses();
  const today = dateKey(new Date());
  const scheduledToday = state.posts.filter(p=>p.scheduledAt && dateKey(p.scheduledAt)===today).length;
  const ready = state.posts.filter(p=>normalizedStatus(p)==='ready').length;
  const posted = state.posts.filter(p=>normalizedStatus(p)==='posted').length;
  const actions = state.posts.filter(p=>normalizedStatus(p)==='action').length;
  $('#statsGrid').innerHTML = [
    ['◷','Scheduled today',scheduledToday,'MYT schedule'],
    ['▶','Ready now',ready,'Available to extension'],
    ['✓','Completed',posted,'Posting sessions finished'],
    ['!','Needs action',actions,'Review required']
  ].map(x=>`<article class="stat-card"><div class="stat-icon">${x[0]}</div><div><small>${x[1]}</small><strong>${x[2]}</strong><span>${x[3]}</span></div></article>`).join('');
}

function sortedPosts(){ return [...state.posts].sort((a,b)=>(a.scheduledAt?new Date(a.scheduledAt).getTime():0)-(b.scheduledAt?new Date(b.scheduledAt).getTime():0)); }
function renderPosts(){
  refreshStatuses();
  const upcoming = sortedPosts().filter(p=>['scheduled','ready','action'].includes(normalizedStatus(p))).slice(0,5);
  $('#upcomingList').innerHTML = upcoming.length ? upcoming.map(p=>{
    const progress=(p.completedGroupIds||[]).length;
    return `<div class="upcoming-item"><div class="time-box"><strong>${p.scheduledAt?esc(formatTime(p.scheduledAt)):'NOW'}</strong><small>${p.scheduledAt?esc(new Intl.DateTimeFormat('en-MY',{day:'numeric',month:'short'}).format(new Date(p.scheduledAt))):'READY'}</small></div><div><h3>${esc(p.listing)}</h3><p>${p.groupIds.length} groups · ${progress}/${p.groupIds.length} completed</p></div>${statusBadge(normalizedStatus(p))}</div>`;
  }).join('') : `<div class="empty-inline">No upcoming posts. Create your first queue item.</div>`;

  const recent = [...state.posts].sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt)).slice(0,8);
  $('#recentTable').innerHTML = recent.length ? recent.map(p=>`<tr><td><strong>${esc(p.listing)}</strong><br><span class="muted">${esc(p.type)}</span></td><td>${p.groupIds.length} groups</td><td>${esc(formatDateTime(p.scheduledAt))}</td><td>${statusBadge(normalizedStatus(p))}</td><td><button class="table-btn" data-edit-schedule="${esc(p.id)}">Manage</button></td></tr>`).join('') : `<tr><td colspan="5" class="muted">No posts yet.</td></tr>`;

  const filtered=state.posts.filter(p=>queueFilter==='all'||normalizedStatus(p)===queueFilter).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  $('#queueTable').innerHTML = filtered.length ? filtered.map(p=>{
    const done=(p.completedGroupIds||[]).length;
    const pct=p.groupIds.length?Math.round(done/p.groupIds.length*100):0;
    return `<tr><td><strong>${esc(p.listing)}</strong><br><span class="muted">${esc(p.type)}</span></td><td>${p.groupIds.length}</td><td>${esc(formatDateTime(p.scheduledAt))}</td><td><div class="progress-cell"><div class="progress"><i style="width:${pct}%"></i></div><span>${done}/${p.groupIds.length}</span></div></td><td>${statusBadge(normalizedStatus(p))}</td><td><div class="row-actions"><button class="table-btn" data-edit-schedule="${esc(p.id)}">Manage</button>${normalizedStatus(p)==='ready'?`<button class="table-btn primary-mini" data-sync-post="${esc(p.id)}">Send</button>`:''}</div></td></tr>`;
  }).join('') : `<tr><td colspan="6" class="muted">No posts in this filter.</td></tr>`;

  const current = sortedPosts().find(p=>normalizedStatus(p)==='ready') || sortedPosts().find(p=>normalizedStatus(p)==='scheduled');
  if(current){
    const done=(current.completedGroupIds||[]).length, total=current.groupIds.length, pct=total?Math.round(done/total*100):0;
    $('#assistantCard').innerHTML=`<div class="ring"><span>${done}</span><small>/${total}</small></div><div><h3>${esc(current.listing)}</h3><p>${normalizedStatus(current)==='ready'?'Ready for posting':'Next: '+esc(formatDateTime(current.scheduledAt))}</p><div class="progress"><i style="width:${pct}%"></i></div><div class="mini-row"><span>${done} posted</span><span>${Math.max(total-done,0)} remaining</span></div></div>`;
  }else $('#assistantCard').innerHTML=`<div class="empty-inline">Queue is clear.</div>`;

  bindDynamicPostButtons();
}

function bindDynamicPostButtons(){
  $$('[data-edit-schedule]').forEach(b=>b.onclick=()=>openScheduleModal(b.dataset.editSchedule));
  $$('[data-sync-post]').forEach(b=>b.onclick=()=>{ syncToExtension(b.dataset.syncPost); toast('Ready post sent to extension'); });
}

function renderSchedule(){
  const days = Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()+i); d.setHours(0,0,0,0); return d; });
  $('#scheduleGrid').innerHTML = days.map(d=>{
    const key=dateKey(d);
    const items=sortedPosts().filter(p=>p.scheduledAt && dateKey(p.scheduledAt)===key);
    const title = new Intl.DateTimeFormat('en-MY',{weekday:'short',day:'numeric',month:'short'}).format(d);
    return `<div class="day-card"><div class="day-head"><h3>${esc(title)}</h3><span>${items.length}</span></div>${items.length?items.map(p=>`<button class="schedule-post" data-edit-schedule="${esc(p.id)}"><strong>${esc(formatTime(p.scheduledAt))}</strong><span>${esc(p.listing)}</span><small>${p.groupIds.length} groups · ${esc(statusLabel(normalizedStatus(p)))}</small></button>`).join(''):'<p class="muted">No posts scheduled.</p>'}</div>`;
  }).join('');
  bindDynamicPostButtons();
}

function renderGroups(){
  const q=($('#groupSearch')?.value||'').toLowerCase().trim();
  const list=state.groups.filter(g=>(activeFilter==='all'||g.type===activeFilter) && (!q||g.name.toLowerCase().includes(q)||g.area.toLowerCase().includes(q)));
  $('#groupCount').textContent=list.length;
  $('#groupCards').innerHTML=list.length?list.map(g=>`<article class="group-card"><div class="group-top"><div><h3>${esc(g.name)}</h3><p>${esc(g.area)} · ${esc(g.type)}</p></div><button class="table-btn" data-edit-group="${esc(g.id)}">Edit</button></div><div class="meta-row"><span class="tag">${esc(g.type)}</span><span class="tag url-tag" title="${esc(g.url)}">${g.url.includes('/groups/')?'Group URL saved':'Check URL'}</span></div></article>`).join(''):`<div class="empty-inline">No groups match this filter.</div>`;
  const counts=['rental','subsale','room','land'].map(type=>[type,state.groups.filter(g=>g.type===type).length]);
  $('#groupSets').innerHTML=counts.filter(x=>x[1]).map(([type,count])=>`<button class="set-card" data-set-type="${type}"><div><strong>${esc(type[0].toUpperCase()+type.slice(1))}</strong><small>${count} groups</small></div><span>›</span></button>`).join('') || '<p class="muted">No sets yet.</p>';
  $$('[data-edit-group]').forEach(b=>b.onclick=()=>openGroupModal(b.dataset.editGroup));
  $$('[data-set-type]').forEach(b=>b.onclick=()=>{ activeFilter=b.dataset.setType; $$('#groupFilters .chip').forEach(x=>x.classList.toggle('active',x.dataset.filter===activeFilter)); renderGroups(); });
  renderTargetGroups();
}

function updateTargetGroupSelectionUI(){
  const inputs=$$('#targetGroups .target-checkbox');
  const selected=inputs.filter(i=>i.checked).length;
  const countEl=$('#selectedGroupCount');
  if(countEl) countEl.textContent=`${selected} selected`;
  const allSelected=inputs.length>0 && selected===inputs.length;
  const selectAll=$('#selectAllGroups');
  if(selectAll) selectAll.textContent=allSelected?'Clear all':'Select all';
}

function renderTargetGroups(){
  if(!$('#targetGroups')) return;
  $('#targetGroups').innerHTML=state.groups.length?state.groups.map((g,idx)=>{
    const cid=`targetGroup_${String(g.id).replace(/[^a-zA-Z0-9_-]/g,'_')}_${idx}`;
    return `<label class="target-option" for="${cid}"><input class="target-checkbox" id="${cid}" type="checkbox" value="${esc(g.id)}"><span class="target-check-ui" aria-hidden="true"></span><span class="target-copy"><strong>${esc(g.name)}</strong><small>${esc(g.area)} · ${esc(g.type)}</small></span></label>`;
  }).join(''):'<p class="muted">No groups saved yet.</p>';
  $('#groupWarning').textContent=state.groups.length?'':'Add at least one Facebook Group before creating a queue item.';
  $$('#targetGroups .target-checkbox').forEach(input=>input.addEventListener('change',updateTargetGroupSelectionUI));
  updateTargetGroupSelectionUI();
}

function renderHistory(){
  $('#historyList').innerHTML=state.history.length?state.history.map(h=>`<div class="history-item"><div class="history-dot"></div><div><strong>${esc(h.message)}</strong><small>${esc(formatDateTime(h.time))}</small></div></div>`).join(''):'<p class="muted">No history yet.</p>';
}
function renderAnalytics(){
  const totalTargets=state.posts.reduce((sum,p)=>sum+p.groupIds.length,0);
  const completed=state.posts.reduce((sum,p)=>sum+(p.completedGroupIds||[]).length,0);
  const completion=totalTargets?Math.round(completed/totalTargets*100):0;
  const typeCounts=['rental','subsale','room','land'].map(t=>[t,state.posts.filter(p=>p.type===t).length]);
  $('#analyticsGrid').innerHTML=`
    <article class="metric-card"><small>Total queue items</small><strong>${state.posts.length}</strong><span>Current browser workspace</span></article>
    <article class="metric-card"><small>Group targets</small><strong>${totalTargets}</strong><span>Across all posts</span></article>
    <article class="metric-card"><small>Group completions</small><strong>${completed}</strong><span>${completion}% overall</span></article>
    <article class="metric-card"><small>Saved groups</small><strong>${state.groups.length}</strong><span>${typeCounts.map(x=>`${x[1]} ${x[0]}`).join(' · ')}</span></article>`;
}
function renderAll(){ renderStats(); renderPosts(); renderSchedule(); renderGroups(); renderHistory(); renderAnalytics(); updateBridgeUI(); }

// Composer
function openModal(id){ const m=$('#'+id); m.classList.add('open'); m.setAttribute('aria-hidden','false'); }
function closeModal(id){ const m=$('#'+id); m.classList.remove('open'); m.setAttribute('aria-hidden','true'); }
function defaultCaption(listing=''){ return `FOR RENT | ${listing || 'Property Listing'}\n\nProperty details here.\n\nInterested? WhatsApp for viewing appointment.`; }
function openComposer(){
  $('#listingInput').value=''; $('#postType').value='rental'; $('#timingMode').value='schedule';
  const next=new Date(Date.now()+60*60*1000); next.setMinutes(Math.ceil(next.getMinutes()/15)*15,0,0);
  $('#scheduleInput').value=localDateTimeValue(next); $('#scheduleInput').disabled=false; $('#scheduleField').classList.remove('disabled');
  $('#captionInput').value=defaultCaption(''); $('#imageUrlsInput').value=''; renderTargetGroups(); syncPreview(); openModal('composerModal');
}
function syncPreview(){
  $('#previewCaption').textContent=$('#captionInput').value || 'Your caption preview will appear here.';
  const urls=$('#imageUrlsInput').value.split('\n').map(x=>x.trim()).filter(Boolean);
  $('#previewImageText').textContent=urls.length?`${urls.length} image URL${urls.length>1?'s':''} ready`:'No image URLs added';
}
function saveComposerPost(){
  const listing=$('#listingInput').value.trim();
  const selected=$$('#targetGroups input:checked').map(i=>i.value);
  if(!listing) return toast('Enter a listing name');
  if(!selected.length) return toast('Select at least one Facebook Group');
  let scheduledAt=null;
  if($('#timingMode').value==='schedule'){
    if(!$('#scheduleInput').value) return toast('Choose a schedule date and time');
    scheduledAt=new Date($('#scheduleInput').value).toISOString();
  }
  const urls=$('#imageUrlsInput').value.split('\n').map(x=>x.trim()).filter(Boolean);
  const post={id:uid('p'),listing,type:$('#postType').value,caption:$('#captionInput').value.trim(),imageUrls:urls,groupIds:selected,scheduledAt,status:scheduledAt&&new Date(scheduledAt)>new Date()?'scheduled':'ready',currentGroupIndex:0,completedGroupIds:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  state.posts.unshift(post); addHistory(`${listing} added to queue for ${selected.length} group${selected.length>1?'s':''}`); saveState(); closeModal('composerModal'); renderAll(); toast('Post saved to queue');
}

// Schedule editor
function openScheduleModal(id){
  const p=state.posts.find(x=>x.id===id); if(!p) return;
  editingPostId=id; $('#editScheduleTitle').textContent=p.listing; $('#editScheduleInput').value=p.scheduledAt?localDateTimeValue(p.scheduledAt):localDateTimeValue(new Date()); openModal('scheduleModal');
}
function saveScheduleEdit(){
  const p=state.posts.find(x=>x.id===editingPostId); if(!p) return;
  if(!$('#editScheduleInput').value) return toast('Choose a date and time');
  p.scheduledAt=new Date($('#editScheduleInput').value).toISOString(); p.status=new Date(p.scheduledAt)<=new Date()?'ready':'scheduled'; p.updatedAt=new Date().toISOString();
  addHistory(`${p.listing} rescheduled to ${formatDateTime(p.scheduledAt)}`); saveState(); closeModal('scheduleModal'); renderAll(); toast('Schedule updated');
}
function deletePost(){
  const p=state.posts.find(x=>x.id===editingPostId); if(!p) return;
  state.posts=state.posts.filter(x=>x.id!==editingPostId); addHistory(`${p.listing} removed from queue`); saveState(); closeModal('scheduleModal'); renderAll(); toast('Queue item deleted');
}

// Group editor
function openGroupModal(id=null){
  editingGroupId=id; const g=id?state.groups.find(x=>x.id===id):null;
  $('#groupModalTitle').textContent=g?'Edit Group':'Add Group'; $('#groupNameInput').value=g?.name||''; $('#groupUrlInput').value=g?.url||''; $('#groupAreaInput').value=g?.area||''; $('#groupTypeInput').value=g?.type||'rental'; $('#deleteGroupBtn').classList.toggle('hidden',!g); openModal('groupModal');
}
function saveGroup(){
  const name=$('#groupNameInput').value.trim(), url=$('#groupUrlInput').value.trim(), area=$('#groupAreaInput').value.trim();
  if(!name||!url) return toast('Group name and URL are required');
  if(!/^https?:\/\/(www\.)?facebook\.com\//i.test(url)) return toast('Use a valid Facebook URL');
  if(editingGroupId){
    const g=getGroup(editingGroupId); Object.assign(g,{name,url,area:area||'—',type:$('#groupTypeInput').value}); addHistory(`${name} group details updated`);
  } else {
    state.groups.unshift({id:uid('g'),name,url,area:area||'—',type:$('#groupTypeInput').value,lastPostedAt:null}); addHistory(`${name} added to group library`);
  }
  saveState(); closeModal('groupModal'); renderAll(); toast('Group saved');
}
function deleteGroup(){
  const g=getGroup(editingGroupId); if(!g) return;
  state.groups=state.groups.filter(x=>x.id!==editingGroupId);
  state.posts.forEach(p=>p.groupIds=p.groupIds.filter(id=>id!==editingGroupId)); addHistory(`${g.name} removed from group library`); saveState(); closeModal('groupModal'); renderAll(); toast('Group removed');
}

// Extension bridge
function extensionPayload(postId=null){
  refreshStatuses();
  const posts=state.posts.filter(p=>!postId||p.id===postId).map(p=>({
    ...p,
    groups:p.groupIds.map(id=>getGroup(id)).filter(Boolean).map(g=>({id:g.id,name:g.name,url:g.url,area:g.area,type:g.type}))
  }));
  return {version:2,syncedAt:new Date().toISOString(),posts,groups:state.groups};
}
function syncToExtension(){
  window.postMessage({source:BRIDGE_SOURCE,type:'TEXTME_SYNC_STATE',payload:extensionPayload()},'*');
}
function requestExtensionState(){ window.postMessage({source:BRIDGE_SOURCE,type:'TEXTME_BRIDGE_PING'},'*'); }
function updateBridgeUI(){
  $('#extensionStatus').textContent=bridgeAvailable?'Browser bridge detected':'Local dashboard ready';
  $('#extensionTitle').textContent=bridgeAvailable?'Extension connected':'Extension sync';
  $('#extensionDot').classList.toggle('offline',!bridgeAvailable);
  $('#bridgeBadge').textContent=bridgeAvailable?'Connected':'Local';
  $('#bridgeBadge').className='badge '+(bridgeAvailable?'posted':'neutral');
}
window.addEventListener('message',e=>{
  if(e.source!==window || e.data?.source!==BRIDGE_REPLY) return;
  if(e.data.type==='TEXTME_BRIDGE_PONG'){ bridgeAvailable=true; updateBridgeUI(); syncToExtension(); }
  if(e.data.type==='TEXTME_EXTENSION_STATE' && e.data.payload){
    bridgeAvailable=true;
    const extPosts=e.data.payload.posts||[];
    let changed=false;
    extPosts.forEach(ep=>{
      const p=state.posts.find(x=>x.id===ep.id); if(!p) return;
      const fields=['status','currentGroupIndex','completedGroupIds','updatedAt'];
      fields.forEach(f=>{ if(ep[f]!==undefined){ p[f]=ep[f]; changed=true; } });
    });
    if(changed){ saveState({sync:false}); renderAll(); }
  }
});

// Events
$$('.nav-item').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$$('[data-view-link]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.viewLink)));
$$('[data-open-composer]').forEach(b=>b.addEventListener('click',openComposer));
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
$$('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{ if(e.target===m) closeModal(m.id); }));
$('#menuBtn').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
$('#groupSearch').addEventListener('input',renderGroups);
$$('#groupFilters .chip').forEach(c=>c.addEventListener('click',()=>{ activeFilter=c.dataset.filter; $$('#groupFilters .chip').forEach(x=>x.classList.toggle('active',x===c)); renderGroups(); }));
$$('#queueTabs .chip').forEach(c=>c.addEventListener('click',()=>{ queueFilter=c.dataset.status; $$('#queueTabs .chip').forEach(x=>x.classList.toggle('active',x===c)); renderPosts(); }));
$('#addGroupBtn').addEventListener('click',()=>openGroupModal());
$('#saveGroupBtn').addEventListener('click',saveGroup); $('#deleteGroupBtn').addEventListener('click',deleteGroup);
$('#timingMode').addEventListener('change',()=>{ const scheduled=$('#timingMode').value==='schedule'; $('#scheduleInput').disabled=!scheduled; $('#scheduleField').classList.toggle('disabled',!scheduled); });
$('#listingInput').addEventListener('input',()=>{ if(!$('#captionInput').dataset.touched) $('#captionInput').value=defaultCaption($('#listingInput').value.trim()); syncPreview(); });
$('#captionInput').addEventListener('input',()=>{ $('#captionInput').dataset.touched='1'; syncPreview(); });
$('#imageUrlsInput').addEventListener('input',syncPreview);
$('#selectAllGroups').addEventListener('click',()=>{
  const inputs=$$('#targetGroups .target-checkbox');
  const shouldCheck=!inputs.length?false:!inputs.every(i=>i.checked);
  inputs.forEach(i=>{ i.checked=shouldCheck; });
  updateTargetGroupSelectionUI();
});
$('#savePostBtn').addEventListener('click',saveComposerPost);
$('#saveScheduleEditBtn').addEventListener('click',saveScheduleEdit); $('#deletePostBtn').addEventListener('click',deletePost);
$('#syncExtensionBtn').addEventListener('click',()=>{ syncToExtension(); requestExtensionState(); toast(bridgeAvailable?'Queue synced to extension':'Sync sent. Open/reload the extension if needed.'); });
$('#resetDemoBtn').addEventListener('click',()=>{ state=demoState(); saveState(); renderAll(); toast('Demo data reset'); });
$('#globalSearch').addEventListener('input',e=>{ const q=e.target.value.toLowerCase(); if(q.includes('group')) setView('groups'); else if(q.includes('queue')||q.includes('post')) setView('queue'); else if(q.includes('schedule')) setView('schedule'); });

setInterval(()=>{ const before=JSON.stringify(state.posts.map(p=>p.status)); refreshStatuses(); const after=JSON.stringify(state.posts.map(p=>p.status)); if(before!==after){ renderAll(); syncToExtension(); } },30000);

renderAll(); requestExtensionState(); setTimeout(()=>syncToExtension(),600);
