/* =========================================================
   OsteoGamme — moteur et affichage
   ---------------------------------------------------------
   Données (critères, diagnostics, pondérations, exemples) :
   osteogamme-data.js, chargé avant ce fichier.
   Logique de calcul reprise telle quelle de l'outil d'origine
   (osteogamme.html) : seuls l'affichage (classes og-*, charte du
   site) et l'accès à l'onglet « Pondérations » changent.
   Onglet « Pondérations » : seulement avec ?admin dans l'adresse,
   ou en local (localhost, 127.0.0.1, fichier ouvert directement).
   ========================================================= */

/* Os précis : poids de la catégorie + bonus propre à l'os ; sites = os + extrémité */
const BONES=Object.keys(CAT);
DX.forEach(d=>{const c=d.w.os||{};const b=BONUS[d.id]||{};const o={};BONES.forEach(k=>{const v=(c[CAT[k]]||0)+(b[k]||0);if(v)o[k]=v});d.w.os=o;d.w.site={...(SITE[d.id]||{})}});
const BONE_LAB={femur:'fémur',tibia:'tibia',fibula:'fibula',humerus:'humérus',radius:'radius / ulna'};
const siteLab=(bone,ext)=>`${BONE_LAB[bone]} ${ext==='proximale'?'proximal':'distal'}${bone==='fibula'?'e':''}`;
const SITES=LONG.flatMap(b=>['proximale','distale'].map(e=>[`${b}-${e}`,siteLab(b,e)]));

/* --- accès à l'onglet « Pondérations » --- */
const ADMIN=(()=>{try{return new URLSearchParams(location.search).has('admin')||location.protocol==='file:'||['localhost','127.0.0.1','[::1]','::1'].includes(location.hostname)}catch(e){return false}})();

/* --- état --- */
let state={...EXAMPLES[0].s};
let overrides={};
try{const o=localStorage.getItem('og-overrides');if(o)overrides=JSON.parse(o)||{}}catch(e){}
const saveOv=()=>{try{localStorage.setItem('og-overrides',JSON.stringify(overrides))}catch(e){}};
const getW=(dx,k,v)=>{const o=overrides[dx.id]?.[k];if(o&&v in o)return o[v];return dx.w[k]?.[v]??0};
const isMod=(dx,k,v)=>overrides[dx.id]?.[k]&&(v in overrides[dx.id][k]);
const active=f=>!f.dep||f.dep(state);
const lab=(f,v)=>f.o.find(o=>o[0]===v)?.[1]??v;
const shortLab={age:'âge',sexe:'sexe',nombre:'',cancer:'cancer connu',os:'',segment:'',axe:'',lodwick:'Lodwick',matrice:'matrice',cloisons:'cloisons',soufflure:'soufflure',nll:'NLL',perioste:'périoste',masse:'masse',signe:''};
const featLabel=(f,v)=>{if(f.k==='extremite')return siteLab(state.os,v);if(f.k==='os')return lab(f,v).toLowerCase();const p=shortLab[f.k];let t=lab(f,v);if(f.k==='matrice'&&v==='aucune')t='pas de matrice';else if(['cloisons','soufflure','nll','masse','cancer'].includes(f.k))t=(v==='oui'?'':'pas de ')+f.l.toLowerCase().split(' /')[0];else if(f.k==='perioste')t='périoste : '+t.toLowerCase();else if(p)t=p+' '+t;return t};

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
        b.addEventListener('click',()=>{state[f.k]=state[f.k]===v?undefined:v;render()});
        c.appendChild(b)});
      fs.appendChild(d)});
    form.appendChild(fs)});
}
function syncForm(){
  F.forEach(f=>{
    const on=active(f);
    form.querySelector(`[data-k="${f.k}"]`).classList.toggle('is-off',!on);
    f.o.forEach(([v])=>{const b=document.getElementById(`c-${f.k}-${v}`);b.setAttribute('aria-pressed',state[f.k]===v?'true':'false');b.disabled=!on});
  });
}

/* --- moteur --- */
function evaluate(){
  const filled=F.filter(f=>state[f.k]&&active(f));
  const res=DX.map(dx=>{
    let tot=0,max=0;const pro=[],con=[];
    filled.forEach(f=>{
      const v=state[f.k];let w,mx;
      if(f.k==='extremite'){
        if(!state.os)return;
        w=getW(dx,'site',`${state.os}-${v}`);
        mx=Math.max(0,...f.o.map(o=>getW(dx,'site',`${state.os}-${o[0]}`)));
      }else{w=getW(dx,f.k,v);mx=Math.max(0,...f.o.map(o=>getW(dx,f.k,o[0])))}
      tot+=w;max+=mx;
      if(w>0)pro.push([w,featLabel(f,v)]);if(w<0)con.push([w,featLabel(f,v)]);
    });
    pro.sort((a,b)=>b[0]-a[0]);con.sort((a,b)=>a[0]-b[0]);
    const pct=max>0?Math.max(0,Math.min(1,tot/max)):0;
    return {dx,tot,pct,pro,con};
  }).sort((a,b)=>b.tot-a.tot||b.pct-a.pct);
  return {filled,res};
}
function flags(){
  const s=state,out=[];
  const aggr=s.lodwick==='II'||s.lodwick==='III'||s.perioste==='agressive'||s.masse==='oui';
  if(aggr)out.push(['red','Lésion d’allure agressive','Compléter par l’IRM et le bilan d’extension. En cas de suspicion de sarcome, biopsie après imagerie complète, en centre de référence, après discussion du trajet avec le chirurgien.']);
  if(s.age==='40+'&&s.matrice!=='chondroide'&&s.matrice!=='verre'&&s.lodwick!=='IA')out.push(['red','Après 40 ans','Une lésion lytique est une métastase ou un myélome jusqu’à preuve du contraire : chercher un primitif, électrophorèse des protéines.']);
  if(s.nombre==='multiple')out.push(['','Lésions multiples','Penser métastases, myélome, histiocytose, enchondromatose, dysplasie fibreuse polyostotique, ostéomyélite multifocale, tumeurs brunes.']);
  if(s.matrice==='chondroide'&&(s.age==='40+'||s.age==='20-40')&&s.os!=='court')out.push(['','Lésion cartilagineuse de l’adulte','Enchondrome ou chondrosarcome de bas grade : regarder la douleur, l’érosion endostée profonde, la rupture corticale, la masse et la taille (> 5 cm).']);
  if(s.lodwick==='IA'&&!aggr&&(s.axe==='corticale'||s.segment==='epiphyse'&&s.age==='40+'))out.push(['','Lésion « ne pas toucher » possible','Si l’aspect est typique (FNO, géode), pas de biopsie : surveillance ou abstention.']);
  return out;
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
EXAMPLES.forEach(e=>{const b=document.createElement('button');b.type='button';b.className='og-ex';b.textContent=e.l;b.addEventListener('click',()=>{state={...e.s};render()});exw.appendChild(b)});
const rb=document.createElement('button');rb.type='button';rb.className='og-ex og-ex-reset';rb.textContent='Tout effacer';rb.addEventListener('click',()=>{state={};render()});exw.appendChild(rb);
document.getElementById('bbgo').addEventListener('click',()=>document.getElementById('results-anchor').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));

/* --- onglets (visibles seulement pour l'administrateur) --- */
document.getElementById('og-tabs').hidden=!ADMIN;
if(!ADMIN&&Object.keys(overrides).length)document.getElementById('og-modifie').hidden=false;
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
function countMods(){let n=0;Object.values(overrides).forEach(k=>Object.values(k).forEach(v=>n+=Object.keys(v).length));return n}
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
          overrides[dx.id]??={};overrides[dx.id][fk]??={};
          if(nw===(dx.w[fk]?.[v]??0)){delete overrides[dx.id][fk][v];if(!Object.keys(overrides[dx.id][fk]).length)delete overrides[dx.id][fk];if(!Object.keys(overrides[dx.id]).length)delete overrides[dx.id]}
          else overrides[dx.id][fk][v]=nw;
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
  Object.entries(overrides).forEach(([id,ks])=>{const dx=DX.find(d=>d.id===id);Object.entries(ks).forEach(([k,vs])=>{const f=F.find(x=>x.k===k);Object.entries(vs).forEach(([v,w])=>{const name=k==='site'?'Site = '+(SITES.find(s=>s[0]===v)?.[1]??v):`${f.l} = ${lab(f,v)}`;lines.push(`${dx.n} | ${name} : ${dx.w[k]?.[v]??0} → ${w}`)})})});
  return lines.length?'Modifications OsteoGamme :\n'+lines.join('\n'):'Aucune modification.';
}
document.getElementById('copy').addEventListener('click',()=>{
  const t=diffText(),fb=document.getElementById('copyfallback'),ta=document.getElementById('copytext'),btn=document.getElementById('copy');
  const show=()=>{fb.hidden=false;ta.value=t;ta.focus();ta.select()};
  try{navigator.clipboard.writeText(t).then(()=>{btn.textContent='Copié';setTimeout(()=>btn.textContent='Copier mes modifications',1600)},show)}catch(e){show()}
});
document.getElementById('resetw').addEventListener('click',()=>{overrides={};saveOv();renderKB();renderResults()});

buildForm();render();
