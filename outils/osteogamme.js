/* =========================================================
   OsteoGamme — affichage de la page
   ---------------------------------------------------------
   Données (critères, diagnostics, pondérations, exemples) :
   osteogamme-data.js ; calcul : osteogamme-moteur.js (code de l'outil
   d'origine, partagé avec la page Comptes rendus), chargés avant ce
   fichier. Ici : l'affichage (classes og-*, charte du site) et
   l'onglet « Pondérations ».
   Onglet « Pondérations » : seulement avec ?admin dans l'adresse,
   ou en local (localhost, 127.0.0.1, fichier ouvert directement).
   ========================================================= */

/* --- accès à l'onglet « Pondérations » --- */
const ADMIN=(()=>{try{return new URLSearchParams(location.search).has('admin')||location.protocol==='file:'||['localhost','127.0.0.1','[::1]','::1'].includes(location.hostname)}catch(e){return false}})();

/* --- moteur partagé (osteogamme-moteur.js) et état --- */
const M=OsteoGammeMoteur(OsteoGammeDonnees);
const {SITES,getW,isMod,active,lab,evaluate,flags}=M;
M.state={...EXAMPLES[0].s};
try{const o=localStorage.getItem('og-overrides');if(o)M.overrides=JSON.parse(o)||{}}catch(e){}
const saveOv=()=>{try{localStorage.setItem('og-overrides',JSON.stringify(M.overrides))}catch(e){}};

/* --- formulaire --- */
const form=document.getElementById('form');
function buildForm(){
  form.innerHTML='';
  GROUPS.forEach((g,i)=>{
    const fs=document.createElement('fieldset');fs.className='og-groupe';fs.dataset.n=i+1;
    fs.innerHTML=`<legend>${g}</legend>`;
    F.filter(f=>f.g===g).forEach(f=>{
      const d=document.createElement('div');d.className='og-field';d.dataset.k=f.k;
      d.innerHTML=`<div class="og-flab" id="lab-${f.k}">${f.l}${f.hint?` <small>(${f.hint})</small>`:''}</div><div class="og-chips" role="group" aria-labelledby="lab-${f.k}"></div>`;
      const c=d.querySelector('.og-chips');
      f.o.forEach(([v,l,h])=>{
        const b=document.createElement('button');b.type='button';b.className='og-chip'+(f.lw?' og-lw':'');b.id=`c-${f.k}-${v}`;
        b.innerHTML=l+(h?`<small>${h}</small>`:'');
        b.addEventListener('click',()=>{M.state[f.k]=M.state[f.k]===v?undefined:v;render()});
        c.appendChild(b)});
      fs.appendChild(d)});
    form.appendChild(fs)});
}
function syncForm(){
  F.forEach(f=>{
    const on=active(f);
    form.querySelector(`[data-k="${f.k}"]`).classList.toggle('is-off',!on);
    f.o.forEach(([v])=>{const b=document.getElementById(`c-${f.k}-${v}`);b.setAttribute('aria-pressed',M.state[f.k]===v?'true':'false');b.disabled=!on});
  });
}

/* --- rendu résultats --- */
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function renderResults(){
  const {filled,res}=evaluate();
  const meta=document.getElementById('meta'),list=document.getElementById('dxlist'),fl=document.getElementById('flags'),bb=document.getElementById('bbtext'),bar=document.getElementById('bottombar');
  meta.textContent=`${filled.length} critère${filled.length>1?'s':''} renseigné${filled.length>1?'s':''} · du plus au moins probable`;
  fl.innerHTML=flags().map(([c,t,x])=>`<div class="og-flag ${c?'og-flag-red':''}"><strong>${t}</strong>${x}</div>`).join('');
  if(filled.length<2){
    list.innerHTML='<li class="og-empty">Renseignez au moins deux critères (par exemple l’âge et la localisation).</li>';
    bar.classList.remove('on');document.body.classList.remove('og-barre');return;
  }
  const top=res.slice(0,5);
  list.innerHTML=top.map((r,i)=>{
    return `<li class="${i===0?'is-first':''}">
      <div class="og-dxhead"><span class="og-dxname"><span class="og-rank">${i+1}</span>${esc(r.dx.n)}</span></div>
      <div class="og-tagrow"><span class="og-nat og-nat-${r.dx.nat}">${r.dx.natl}</span></div>
      <div class="og-why">
        ${r.pro.length?`<div><b>Pour</b>${r.pro.slice(0,4).map(x=>`<span class="og-pill og-pill-p">${esc(x[1])}</span>`).join('')}</div>`:''}
        ${r.con.length?`<div><b>Contre</b>${r.con.slice(0,3).map(x=>`<span class="og-pill og-pill-n">${esc(x[1])}</span>`).join('')}</div>`:''}
      </div>
      ${i<2?`<p class="og-pearl">${esc(r.dx.p)}</p>`:''}
    </li>`}).join('');
  bb.innerHTML=`<b>1</b> ${esc(top[0].dx.n)}`;
  const on=!document.getElementById('v-analyse').hidden;
  bar.classList.toggle('on',on);document.body.classList.toggle('og-barre',on);
}
function render(){syncForm();renderResults()}

/* --- exemples --- */
const exw=document.getElementById('examples');
EXAMPLES.forEach(e=>{const b=document.createElement('button');b.type='button';b.className='og-ex';b.textContent=e.l;b.addEventListener('click',()=>{M.state={...e.s};render()});exw.appendChild(b)});
const rb=document.createElement('button');rb.type='button';rb.className='og-ex og-ex-reset';rb.textContent='Tout effacer';rb.addEventListener('click',()=>{M.state={};render()});exw.appendChild(rb);
document.getElementById('bbgo').addEventListener('click',()=>document.getElementById('results-anchor').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));

/* --- onglets (visibles seulement pour l'administrateur) --- */
document.getElementById('og-tabs').hidden=!ADMIN;
if(!ADMIN&&Object.keys(M.overrides).length)document.getElementById('og-modifie').hidden=false;
document.querySelectorAll('.og-tabs button').forEach(b=>b.addEventListener('click',()=>{
  const t=b.dataset.tab;
  if(t==='kb'&&!ADMIN)return;
  document.querySelectorAll('.og-tabs button').forEach(x=>x.setAttribute('aria-selected',x===b?'true':'false'));
  document.getElementById('v-analyse').hidden=t!=='analyse';
  document.getElementById('v-kb').hidden=t!=='kb';
  if(t==='kb')renderKB();
  renderResults();
}));

/* --- pondérations --- */
const sel=document.getElementById('kbsel');
DX.forEach(d=>{const o=document.createElement('option');o.value=d.id;o.textContent=d.n;sel.appendChild(o)});
sel.addEventListener('change',renderKB);
const CYCLE=[-3,-2,-1,0,1,2,3];
function countMods(){let n=0;Object.values(M.overrides).forEach(k=>Object.values(k).forEach(v=>n+=Object.keys(v).length));return n}
function renderKB(){
  const dx=DX.find(d=>d.id===sel.value);
  document.getElementById('kbpearl').textContent=dx.p;
  const g=document.getElementById('kbgrid');g.innerHTML='';
  GROUPS.forEach(gr=>{
    const card=document.createElement('div');card.className='og-kbcard';
    card.innerHTML=`<h3>${gr}</h3>`;
    F.filter(f=>f.g===gr).forEach(f=>{
      const fk=f.k==='extremite'?'site':f.k;
      const opts=f.k==='extremite'?SITES:f.o;
      if(f.k==='extremite'){const h=document.createElement('h3');h.textContent='Sites précis';h.className='og-kbsites';card.appendChild(h)}
      opts.forEach(([v,l])=>{
        const w=getW(dx,fk,v);
        const row=document.createElement('div');row.className='og-kbrow';
        row.innerHTML=`<span>${f.k==='lodwick'?'Lodwick ':''}${f.k==='extremite'?l.charAt(0).toUpperCase()+l.slice(1):l}${['cloisons','soufflure','nll','masse','cancer'].includes(f.k)?` <small>(${f.l.toLowerCase()})</small>`:''}</span>`;
        const b=document.createElement('button');b.type='button';b.id=`w-${fk}-${v}`;
        b.className='og-w'+(w>0?' og-w-p':w<0?' og-w-n':'')+(isMod(dx,fk,v)?' is-mod':'');
        b.textContent=(w>0?'+':w<0?'−':'')+Math.abs(w);
        b.setAttribute('aria-label',`${l} : ${w}`);
        b.addEventListener('click',()=>{
          const i=CYCLE.indexOf(Math.max(-3,Math.min(3,w)));const nw=CYCLE[(i+1)%CYCLE.length];
          M.overrides[dx.id]??={};M.overrides[dx.id][fk]??={};
          if(nw===(dx.w[fk]?.[v]??0)){delete M.overrides[dx.id][fk][v];if(!Object.keys(M.overrides[dx.id][fk]).length)delete M.overrides[dx.id][fk];if(!Object.keys(M.overrides[dx.id]).length)delete M.overrides[dx.id]}
          else M.overrides[dx.id][fk][v]=nw;
          saveOv();renderKB();renderResults();
        });
        row.appendChild(b);card.appendChild(row);
      });
    });
    g.appendChild(card);
  });
  const n=countMods();document.getElementById('modcount').textContent=n?`${n} valeur${n>1?'s':''} modifiée${n>1?'s':''}`:'Aucune modification';
}
function diffText(){
  const lines=[];
  Object.entries(M.overrides).forEach(([id,ks])=>{const dx=DX.find(d=>d.id===id);Object.entries(ks).forEach(([k,vs])=>{const f=F.find(x=>x.k===k);Object.entries(vs).forEach(([v,w])=>{const name=k==='site'?'Site = '+(SITES.find(s=>s[0]===v)?.[1]??v):`${f.l} = ${lab(f,v)}`;lines.push(`${dx.n} | ${name} : ${dx.w[k]?.[v]??0} → ${w}`)})})});
  return lines.length?'Modifications OsteoGamme :\n'+lines.join('\n'):'Aucune modification.';
}
document.getElementById('copy').addEventListener('click',()=>{
  const t=diffText(),fb=document.getElementById('copyfallback'),ta=document.getElementById('copytext'),btn=document.getElementById('copy');
  const show=()=>{fb.hidden=false;ta.value=t;ta.focus();ta.select()};
  try{navigator.clipboard.writeText(t).then(()=>{btn.textContent='Copié';setTimeout(()=>btn.textContent='Copier mes modifications',1600)},show)}catch(e){show()}
});
document.getElementById('resetw').addEventListener('click',()=>{M.overrides={};saveOv();renderKB();renderResults()});

buildForm();render();
