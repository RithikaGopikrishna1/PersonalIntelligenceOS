/* THE EDIT — one-screen news magazine. No AI, tracking, or paid services. */
const CATS = [
  ['all','Overall Top 3'],['world','World'],['india','India'],['uk-us','UK & US'],
  ['business','Business'],['ai-tech','AI & Tech'],['startups','Startups'],
  ['sports','Sports'],['science','Science'],['culture','Culture'],
  ['learning','Daily Learning'],['women','Women & Design']
];
const LABEL = Object.fromEntries(CATS);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = s => /^https?:\/\//i.test(s || '') ? esc(s) : '#';
const formatDate = s => { const d=new Date(s);return !s||isNaN(d.getTime())?'Recent':new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'}).format(d); };
let articles=[], active='all', savedOnly=false, query='', refreshedAt=null;
let saved = new Set();
try { saved = new Set(JSON.parse(localStorage.getItem('edit-saved') || '[]')); } catch {}

const today = new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
$('today').textContent=today;
$('nav').innerHTML=CATS.map(([key,label])=>`<button class="tab" data-tab="${key}" type="button">${esc(label)}</button>`).join('');
$('categorySelect').innerHTML=CATS.map(([key,label])=>`<option value="${key}">${esc(label)}</option>`).join('');
$('nav').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)choose(b.dataset.tab);});
$('categorySelect').addEventListener('change',e=>choose(e.target.value));
$('homeLink').addEventListener('click',e=>{e.preventDefault();choose('all');});
$('search').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase(); savedOnly=false;render();});
$('savedBtn').addEventListener('click',()=>{savedOnly=!savedOnly;render();});
$('refreshBtn').addEventListener('click',()=>load());
$('content').addEventListener('click',e=>{
  const b=e.target.closest('[data-save]');if(!b)return;
  const url=b.getAttribute('data-save');
  if(saved.has(url))saved.delete(url);else saved.add(url);
  try{localStorage.setItem('edit-saved',JSON.stringify([...saved]));}catch{}
  render();
});
function choose(cat){active=cat;savedOnly=false;query='';$('search').value='';render();}

/* A transparent, heuristic ranking — useful curation, not a claim of objective importance. */
const MAJOR = /\b(election|president|prime minister|government|parliament|supreme court|court ruling|war|ceasefire|peace deal|conflict|attack|earthquake|flood|climate summit|treaty|trade deal|tariff|sanctions|central bank|interest rates|inflation|budget|economic growth|breakthrough|discovery|launch|regulation|policy|agreement|championship|world cup|final|record|funding|acquisition|merger|research|study|rights|law|reform|crisis|resigns|wins|announces|approval)\b/i;
const LOW_VALUE = /\b(quiz|shopping guide|review:|opinion:|what to watch|weekly roundup|live updates|live blog|newsletter|how to buy|deals? on|best gifts)\b/i;
const STOP = new Set('the a an and or of to on in for from with at as is are by after over under this that new has have it its says said about how why what who when will you your their his her been into amid than more latest'.split(' '));
function words(t){return new Set(String(t||'').toLowerCase().match(/[a-z]{4,}/g)?.filter(w=>!STOP.has(w))||[]);}
function similarity(a,b){let A=words(a),B=words(b);if(!A.size||!B.size)return 0;let common=0;for(let w of A)if(B.has(w))common++;return common/Math.min(A.size,B.size);}
function score(a,whole){
  const age=a.date?(Date.now()-new Date(a.date).getTime())/3600000:168;
  const freshness=Number.isFinite(age)?Math.max(0,52-Math.max(0,age)*0.28):5;
  let score=freshness;
  if(MAJOR.test(a.title)) score+=9;
  if(LOW_VALUE.test(a.title)) score-=18;
  if(a.summary && a.summary.length>65) score+=2;
  // Other publishers discussing a substantially similar headline are a modest signal.
  let matches=0;
  for(const b of whole){
    if(b===a || b.source===a.source || b.category!==a.category)continue;
    if(similarity(a.title,b.title)>=0.58){matches++;if(matches>=2)break;}
  }
  score+=matches*8;
  return score;
}
function ranked(list){return list.map(a=>({a,points:score(a,list)})).sort((x,y)=>y.points-x.points || (y.a.date||'').localeCompare(x.a.date||'')).map(x=>x.a);}
function pickOverall(items){
  const r=ranked(items),picked=[],categories=new Set();
  for(const x of r){if(categories.has(x.category))continue;picked.push(x);categories.add(x.category);if(picked.length===3)return picked;}
  for(const x of r){if(!picked.includes(x))picked.push(x);if(picked.length===3)break;}
  return picked;
}
function quote(a){let text=(a.summary||'').trim();if(!text)return 'Open the original reporting for the full details.';return text;}
function img(a,number){
  const label=esc(LABEL[a.category]||a.category);
  return a.image && /^https:\/\//.test(a.image)
    ? `<div class="image-box"><img src="${safeUrl(a.image)}" alt="" loading="lazy" onerror="this.closest('.image-box').classList.add('img-error')"><span class="big-number" aria-hidden="true">${number}</span></div>`
    : `<div class="image-box no-image"><span class="abstract-lines" aria-hidden="true"></span><span class="big-number" aria-hidden="true">${number}</span><span class="placeholder-name">${label}</span></div>`;
}
function card(a,index,kind){
  const bookmarked=saved.has(a.url);
  return `<article class="story-card ${kind}">
    ${img(a,String(index+1).padStart(2,'0'))}
    <div class="card-text">
      <div class="eyebrow"><span>${esc(LABEL[a.category]||'News')}</span><span>${esc(a.source||'Source')} · ${formatDate(a.date)}</span></div>
      <a class="story-link" href="${safeUrl(a.url)}" target="_blank" rel="noopener noreferrer"><h2>${esc(a.title)}</h2></a>
      <p class="story-summary">${esc(quote(a))}</p>
      <div class="card-foot"><span>READ STORY ↗</span><button type="button" class="bookmark" data-save="${esc(a.url)}" title="${bookmarked?'Remove saved story':'Save story'}" aria-label="${bookmarked?'Remove saved story':'Save story'}" aria-pressed="${bookmarked}">${bookmarked?'♥':'♡'}</button></div>
    </div>
  </article>`;
}
function render(){
  $('nav').querySelectorAll('[data-tab]').forEach(b=>{const on=!savedOnly&&b.dataset.tab===active;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  $('categorySelect').value=active;
  $('savedBtn').setAttribute('aria-pressed',String(savedOnly));
  $('savedBtn').classList.toggle('active',savedOnly);
  $('savedCount').textContent=saved.size;
  let filtered=articles.filter(a=>(active==='all'||a.category===active)&&(!savedOnly||saved.has(a.url))&&(`${a.title} ${a.summary} ${a.source}`).toLowerCase().includes(query));
  const isOverall=active==='all'&&!savedOnly&&!query;
  const selection=(isOverall?pickOverall(filtered):ranked(filtered).slice(0,5));
  let heading=savedOnly?'Saved Stories':query?'Search Results':isOverall?'The three stories to know.':LABEL[active];
  let kicker=savedOnly?'YOUR READING LIST':query?'YOUR EDITION, FILTERED':isOverall?'OVERALL · TOP THREE':`${LABEL[active].toUpperCase()} · TOP FIVE`;
  let subtitle=isOverall?'Three highlights selected across different topics.':savedOnly?'Your reading list, kept in this browser.':'The key recent stories in this section.';
  if(!selection.length){
    $('content').innerHTML=`<div class="section-head"><div><div class="kicker">${esc(kicker)}</div><h1>${esc(heading)}</h1></div></div><div class="empty-state"><h2>${articles.length?'No matching stories.':'Your first edition is on its way.'}</h2><p>${articles.length?'Try another section or clear your search.':'Run your GitHub news-refresh workflow to publish the first feed update.'}</p></div>`;
    return;
  }
  $('content').innerHTML=`<div class="section-head"><div class="heading-block"><div class="kicker">${esc(kicker)}</div><h1>${esc(heading)}</h1></div><div class="section-note">${esc(subtitle)}</div></div><div class="story-layout count-${selection.length} ${isOverall?'overall':'category'}">${selection.map((a,i)=>card(a,i,i===0?'lead':'support')).join('')}</div>`;
}
async function load(){
  $('refreshBtn').disabled=true;
  try{
    const response=await fetch('data.json?nocache='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw new Error('Feed response '+response.status);
    const json=await response.json();
    const seen=new Set();
    articles=(Array.isArray(json.articles)?json.articles:[]).filter(a=>{
      if(!a||!a.title||!a.url||!LABEL[a.category]||!/^https?:\/\//.test(a.url)||seen.has(a.url))return false;
      seen.add(a.url);return true;
    });
    refreshedAt=json.updatedAt;
    const updated=refreshedAt?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'}).format(new Date(refreshedAt))+' UTC':'Waiting for first feed update';
    $('status').innerHTML=`<span class="status-dot"></span><span class="status-label">${articles.length?'Edition refreshed':'Awaiting stories'}</span> <span class="status-time">· ${esc(updated)}</span>`;
    render();
  } catch (e){
    $('status').textContent='Unable to load the edition';
    $('content').innerHTML='<div class="empty-state"><h2>Unable to load the news.</h2><p>Refresh this page after your GitHub workflow publishes updated data.</p></div>';
  } finally {$('refreshBtn').disabled=false;}
}
load();
