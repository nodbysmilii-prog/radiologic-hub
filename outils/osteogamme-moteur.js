/* =========================================================
   OsteoGamme — moteur de calcul (sans affichage)
   ---------------------------------------------------------
   Partagé par la page outils/osteogamme et l'outil « OsteoGamme »
   de la page Comptes rendus. Le code du calcul est celui de l'outil
   d'origine, recopié tel quel : seule change l'enveloppe (une fonction
   qui reçoit les données de osteogamme-data.js et garde l'état et les
   pondérations modifiées). Ne pas modifier la logique ici : les
   pondérations se changent dans osteogamme-data.js.

   const M = OsteoGammeMoteur(OsteoGammeDonnees);
   M.state = { age: '20-40', os: 'femur', … };   // critères cochés
   M.evaluate()  → { filled, res: [{ dx, tot, pct, pro, con }, …] } du plus au moins probable
   M.flags()     → [[classe, titre, texte], …] alertes
   ========================================================= */

(function (racine) {
  function OsteoGammeMoteur(D) {
    const { LONG, CAT, F, DX, BONUS, SITE } = D;

    /* Os précis : poids de la catégorie + bonus propre à l'os ; sites = os + extrémité
       (calculé une seule fois, même si le moteur est créé plusieurs fois) */
    const BONES=Object.keys(CAT);
    if(!DX.__osteogammeEtendu){DX.forEach(d=>{const c=d.w.os||{};const b=BONUS[d.id]||{};const o={};BONES.forEach(k=>{const v=(c[CAT[k]]||0)+(b[k]||0);if(v)o[k]=v});d.w.os=o;d.w.site={...(SITE[d.id]||{})}});Object.defineProperty(DX,'__osteogammeEtendu',{value:true})}
    const BONE_LAB={femur:'fémur',tibia:'tibia',fibula:'fibula',humerus:'humérus',radius:'radius / ulna'};
    const siteLab=(bone,ext)=>`${BONE_LAB[bone]} ${ext==='proximale'?'proximal':'distal'}${bone==='fibula'?'e':''}`;
    const SITES=LONG.flatMap(b=>['proximale','distale'].map(e=>[`${b}-${e}`,siteLab(b,e)]));

    /* --- état : critères cochés et pondérations modifiées (onglet Pondérations) --- */
    let state = {};
    let overrides = {};
    const getW=(dx,k,v)=>{const o=overrides[dx.id]?.[k];if(o&&v in o)return o[v];return dx.w[k]?.[v]??0};
    const isMod=(dx,k,v)=>overrides[dx.id]?.[k]&&(v in overrides[dx.id][k]);
    const active=f=>!f.dep||f.dep(state);
    const lab=(f,v)=>f.o.find(o=>o[0]===v)?.[1]??v;
    const shortLab={age:'âge',sexe:'sexe',nombre:'',cancer:'cancer connu',os:'',segment:'',axe:'',lodwick:'Lodwick',matrice:'matrice',cloisons:'cloisons',soufflure:'soufflure',nll:'NLL',perioste:'périoste',masse:'masse',signe:''};
    const featLabel=(f,v)=>{if(f.k==='extremite')return siteLab(state.os,v);if(f.k==='os')return lab(f,v).toLowerCase();const p=shortLab[f.k];let t=lab(f,v);if(f.k==='matrice'&&v==='aucune')t='pas de matrice';else if(['cloisons','soufflure','nll','masse','cancer'].includes(f.k))t=(v==='oui'?'':'pas de ')+f.l.toLowerCase().split(' /')[0];else if(f.k==='perioste')t='périoste : '+t.toLowerCase();else if(p)t=p+' '+t;return t};

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

    return {
      BONES, BONE_LAB, siteLab, SITES, getW, isMod, active, lab, featLabel, evaluate, flags,
      get state() { return state; }, set state(s) { state = s; },
      get overrides() { return overrides; }, set overrides(o) { overrides = o; },
    };
  }
  racine.OsteoGammeMoteur = OsteoGammeMoteur;
  if (typeof module === 'object' && module.exports) module.exports = OsteoGammeMoteur;
})(typeof self !== 'undefined' ? self : this);
