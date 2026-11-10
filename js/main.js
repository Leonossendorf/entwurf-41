/* Kinderärzte Borghorst & Ochtrup – Entwurf. Kein Tracking, keine Cookies. */
(function(){
  'use strict';
  var BUCHUNG='https://app.arzt-direkt.de/kinderaerzte-borghorst-ochtrup/booking';

  /* ---------- Zeiten (Stand: Website der Praxis, 10.11.2026) ---------- */
  // Tage: 1=Mo … 5=Fr, Zeiten in Minuten
  function z(s){var p=s.split(':');return (+p[0])*60+(+p[1]);}
  function b(a,e){return [z(a),z(e)];}
  var ZEITEN={
    borghorst:{name:'Borghorst',tage:{1:[b('8:00','12:30'),b('13:30','17:00')],2:[b('8:00','12:30'),b('13:30','17:00')],3:[b('8:00','12:30')],4:[b('8:00','12:30'),b('13:30','17:00')],5:[b('8:00','12:30')]}},
    ochtrup:{name:'Ochtrup',tage:{1:[b('8:30','12:30'),b('13:30','17:00')],2:[b('8:30','12:30'),b('13:30','17:00')],3:[b('8:00','12:30')],4:[b('8:30','12:30'),b('13:30','17:00')],5:[b('8:30','12:30')]}},
    neuenkirchen:{name:'Neuenkirchen',tage:{2:[b('8:00','12:30')],3:[b('8:00','12:30')],4:[b('8:00','12:30')]}}
  };
  var TELEFON={1:[b('8:30','12:00'),b('13:30','16:30')],2:[b('8:30','12:00'),b('13:30','16:30')],3:[b('8:30','12:00')],4:[b('8:30','12:00'),b('13:30','16:30')],5:[b('8:30','12:00')]};
  // Gesetzliche Feiertage NRW
  var FEIERTAGE=['2026-01-01','2026-04-03','2026-04-06','2026-05-01','2026-05-14','2026-05-25','2026-06-04','2026-10-03','2026-11-01','2026-12-25','2026-12-26',
                 '2027-01-01','2027-03-26','2027-03-29','2027-05-01','2027-05-06','2027-05-17','2027-05-27','2027-10-03','2027-11-01','2027-12-25','2027-12-26'];
  var TAGNAME=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
  var MONAT=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

  function jetztBerlin(){
    var d=new Date();
    try{
      var f=new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',weekday:'short'});
      var t={};f.formatToParts(d).forEach(function(p){t[p.type]=p.value;});
      var y=+t.year,m=+t.month,da=+t.day;
      var wd=new Date(Date.UTC(y,m-1,da)).getUTCDay();
      return {y:y,m:m,d:da,wd:wd,min:(+t.hour)*60+(+t.minute)};
    }catch(e){return {y:d.getFullYear(),m:d.getMonth()+1,d:d.getDate(),wd:d.getDay(),min:d.getHours()*60+d.getMinutes()};}
  }
  function iso(y,m,d){return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');}
  function uhr(min){return Math.floor(min/60)+':'+String(min%60).padStart(2,'0');}
  function istFeiertag(j){return FEIERTAGE.indexOf(iso(j.y,j.m,j.d))>-1;}
  function blocks(plan,wd,feiertag){return feiertag?[]:(plan[wd]||[]);}

  // Nächster offener Termin ab morgen (max. 10 Tage)
  function naechste(plan,j){
    for(var i=1;i<=10;i++){
      var dt=new Date(Date.UTC(j.y,j.m-1,j.d+i));
      var jj={y:dt.getUTCFullYear(),m:dt.getUTCMonth()+1,d:dt.getUTCDate(),wd:dt.getUTCDay()};
      var bl=blocks(plan,jj.wd,istFeiertag(jj));
      if(bl.length){return {tag:(i===1?'morgen':TAGNAME[jj.wd]),ab:uhr(bl[0][0])};}
    }
    return null;
  }
  function status(plan,j){
    var bl=blocks(plan,j.wd,istFeiertag(j));
    for(var i=0;i<bl.length;i++){
      if(j.min>=bl[i][0]&&j.min<bl[i][1]) return {offen:true,wort:'geöffnet',rest:' bis '+uhr(bl[i][1])};
      if(j.min<bl[i][0]) return {offen:false,wort:(i===0?'öffnet':'Mittagspause'),rest:(i===0?' heute um ':' bis ')+uhr(bl[i][0])};
    }
    var n=naechste(plan,j);
    return {offen:false,wort:'geschlossen',rest:(n?', wieder '+n.tag+' ab '+n.ab:'')};
  }

  function aktualisieren(){
    var j=jetztBerlin(), feiertag=istFeiertag(j);
    var datum=document.querySelector('[data-heute-datum]');
    if(datum) datum.textContent=TAGNAME[j.wd]+', '+j.d+'. '+MONAT[j.m-1]+(feiertag?' (Feiertag)':'');
    var allesZu=true;
    Object.keys(ZEITEN).forEach(function(k){
      var s=status(ZEITEN[k].tage,j); if(s.offen) allesZu=false;
      var li=document.querySelector('[data-standort="'+k+'"] [data-status]');
      if(li){li.innerHTML='';var st=document.createElement('strong');st.textContent=s.wort;li.appendChild(st);li.appendChild(document.createTextNode(s.rest));li.classList.toggle('ist-zu',!s.offen);}
      var kart=document.querySelector('[data-jetzt="'+k+'"]');
      if(kart){var tx=(s.offen?'Jetzt geöffnet':s.wort.charAt(0).toUpperCase()+s.wort.slice(1))+s.rest;kart.textContent=tx;kart.classList.toggle('offen',s.offen);}
      document.querySelectorAll('#zeiten-'+k+' tr[data-tag]').forEach(function(tr){tr.classList.toggle('heute',+tr.dataset.tag===j.wd&&!feiertag);});
    });
    var zu=document.querySelector('[data-zu-hinweis]'); if(zu) zu.hidden=!allesZu;

    // Telefon
    var t=status(TELEFON,j);
    var telText=t.offen?'Telefon jetzt besetzt,'+t.rest:'Telefon gerade nicht besetzt. Online geht immer.';
    var tafelTel=document.querySelector('[data-telefon]'); if(tafelTel) tafelTel.textContent=t.offen?'Telefon 02552 62222, besetzt'+t.rest:'Telefon gerade nicht besetzt';
    var band=document.querySelector('[data-telefon-jetzt]'); if(band) band.textContent=telText;

    // Notdienst jetzt
    var nd=document.querySelector('[data-notdienst-jetzt]'), karte=null, msg='';
    var wochenende=(j.wd===0||j.wd===6||feiertag);
    if(!allesZu){msg='Gerade ist mindestens eine unserer Praxen geöffnet. Buchen Sie online einen Termin oder rufen Sie uns an.';}
    else if(wochenende&&j.min>=480&&j.min<1200){karte='notfallpraxis';msg='Jetzt zuständig: Notfallpraxis der Kinder- und Jugendärzte in Rheine, bis 20:00.';}
    else if((j.wd===3||j.wd===5)&&j.min>=1020&&j.min<1200){karte='notfallpraxis';msg='Jetzt zuständig: Notfallpraxis der Kinder- und Jugendärzte in Rheine, bis 20:00.';}
    else if(j.min>=1200||j.min<480){karte='kinderklinik';msg='Jetzt zuständig: Kinderklinik im Mathias-Spital Rheine.';}
    else if((j.wd===1||j.wd===2||j.wd===4)&&j.min>=1080){karte='kinderklinik';msg='Jetzt zuständig: Kinderklinik im Mathias-Spital Rheine, bis 20:00.';}
    else {msg='Bis zur nächsten Sprechstunde: Der Bereitschaftsdienst 116 117 sagt Ihnen, wer Dienst hat.';}
    if(nd) nd.textContent=msg;
    document.querySelectorAll('.notkarte').forEach(function(k){k.classList.toggle('ist-jetzt',karte&&k.id===karte);});
  }
  aktualisieren(); setInterval(aktualisieren,60000);

  /* ---------- Vorsorge-Rechner (Zeitangaben wie in der Online-Buchung der Praxis) ---------- */
  // typ 'um': empfohlen um dieses Alter; typ 'von': Zeitraum
  var US=[
    {u:'U3',txt:'im Alter von 4 bis 7 Wochen',von:{w:4},bis:{w:7},hinweis:'Nur in Borghorst, wegen des Hüft-Ultraschalls.'},
    {u:'U4',txt:'im Alter von 3 Monaten',um:{m:3}},
    {u:'U5',txt:'im Alter von 6 Monaten',um:{m:6}},
    {u:'U6',txt:'um den ersten Geburtstag',um:{m:12}},
    {u:'U7',txt:'um den 2. Geburtstag',um:{m:24}},
    {u:'U7a',txt:'um den 3. Geburtstag',um:{m:36}},
    {u:'U8',txt:'um den 4. Geburtstag',um:{m:48}},
    {u:'U9',txt:'um den 5. Geburtstag',um:{m:60}},
    {u:'U10',txt:'vom 7. bis zum 9. Geburtstag',von:{m:84},bis:{m:108}},
    {u:'U11',txt:'vom 9. bis zum 11. Geburtstag',von:{m:108},bis:{m:132}},
    {u:'J1',txt:'von 12 Jahren bis zum 14. Geburtstag',von:{m:144},bis:{m:168}},
    {u:'J2',txt:'vom 16. bis zum 18. Geburtstag',von:{m:192},bis:{m:216}}
  ];
  var liste=document.getElementById('u-liste');
  if(liste){US.forEach(function(x){var li=document.createElement('li');li.innerHTML='<b>'+x.u+'</b><span>'+x.txt+(x.hinweis?' <em>('+x.hinweis.replace('.','')+')</em>':'')+'</span>';liste.appendChild(li);});}
  function plus(g,o){var d=new Date(g.getTime());if(o.w)d.setDate(d.getDate()+7*o.w);if(o.m)d.setMonth(d.getMonth()+o.m);return d;}
  function fmt(d){return d.getDate()+'. '+MONAT[d.getMonth()]+' '+d.getFullYear();}
  var form=document.getElementById('u-rechner'), erg=document.getElementById('u-ergebnis');
  if(form){form.addEventListener('submit',function(e){
    e.preventDefault();
    var v=document.getElementById('geburt').value; erg.innerHTML='';
    if(!v){erg.textContent='Bitte wählen Sie das Geburtsdatum aus.';return;}
    var g=new Date(v+'T12:00:00'), heute=new Date(); heute.setHours(12,0,0,0);
    if(g>heute){erg.textContent='Das Datum liegt in der Zukunft. Bitte prüfen Sie die Eingabe.';return;}
    var gefunden=null;
    for(var i=0;i<US.length;i++){
      var x=US[i], ende, start;
      if(x.um){start=plus(g,{m:x.um.m-1});ende=plus(g,{m:x.um.m+1});}
      else {start=plus(g,x.von);ende=plus(g,x.bis);}
      if(ende>=heute){gefunden={x:x,start:start,ende:ende,ziel:x.um?plus(g,x.um):null};break;}
    }
    var box=document.createElement('div');box.className='u-treffer';
    if(!gefunden){box.innerHTML='<div class="u-treffer__text"><p><strong>Alle Vorsorgen bis zur J2 liegen hinter Ihnen.</strong> Bei Fragen sprechen Sie uns gern an.</p></div>';erg.appendChild(box);return;}
    var x=gefunden.x, wann;
    if(gefunden.ziel){wann='Empfohlen '+x.txt+', also um den '+fmt(gefunden.ziel)+'.';}
    else{wann='Zeitraum '+x.txt+': '+fmt(gefunden.start)+' bis '+fmt(new Date(gefunden.ende.getTime()-864e5))+'.';}
    var jetzt=gefunden.start<=heute;
    box.innerHTML='<span class="u-marke" aria-hidden="true">'+x.u+'</span><div class="u-treffer__text"><p><strong>'+(jetzt?'Jetzt dran: ':'Als Nächstes: ')+x.u+'</strong></p><p>'+wann+'</p>'+(x.hinweis?'<p><strong>'+x.hinweis+'</strong></p>':'')+'<a class="knopf knopf--haupt" href="'+BUCHUNG+'" target="_blank" rel="noopener">'+x.u+' online buchen<span class="sr"> (neues Fenster)</span></a><p class="klein" style="margin-top:.6rem">Bei der Terminart „'+x.u+' Vorsorge'+(x.u==='U3'?'':'untersuchung')+'“ wählen.</p></div>';
    erg.appendChild(box);
  });}

  /* ---------- Ansicht / Barrierefreiheit ---------- */
  var dlg=document.getElementById('ansicht'), auf=document.getElementById('ansicht-oeffnen'), html=document.documentElement;
  var A={}; try{A=JSON.parse(localStorage.getItem('ansicht')||'{}');}catch(e){}
  function speichern(){try{localStorage.setItem('ansicht',JSON.stringify(A));}catch(e){}}
  function anwenden(){
    if(A.schrift) html.dataset.schrift=A.schrift; else delete html.dataset.schrift;
    ['kontrast','ruhe','abstand','links'].forEach(function(k){if(A[k]) html.dataset[k]='1'; else delete html.dataset[k];});
  }
  if(dlg&&auf){
    auf.addEventListener('click',function(){
      dlg.querySelectorAll('input[name=schrift]').forEach(function(r){r.checked=(r.value===(A.schrift||''));});
      ['kontrast','ruhe','abstand','links'].forEach(function(k){var c=dlg.querySelector('input[name='+k+']');if(c)c.checked=!!A[k];});
      if(dlg.showModal) dlg.showModal(); else dlg.setAttribute('open','');
    });
    dlg.addEventListener('change',function(e){
      var t=e.target; if(t.name==='schrift') A.schrift=t.value; else A[t.name]=t.checked;
      anwenden(); speichern();
    });
    dlg.addEventListener('close',function(){auf.focus();});
    dlg.addEventListener('click',function(e){if(e.target===dlg) dlg.close();});
  }
  // Vorlesen
  var vl=document.getElementById('vorlesen');
  if(vl){
    if(!('speechSynthesis' in window)){vl.hidden=true;}
    vl.addEventListener('click',function(){
      var s=window.speechSynthesis;
      if(s.speaking){s.cancel();vl.textContent='Seite vorlesen';vl.setAttribute('aria-pressed','false');return;}
      var teile=[];document.querySelectorAll('main h1, main h2, main h3, main p, main li').forEach(function(el){if(el.offsetParent!==null&&!el.closest('.u-liste')) teile.push(el.innerText);});
      var u=new SpeechSynthesisUtterance(teile.join('. ')); u.lang='de-DE'; u.rate=.95;
      u.onend=function(){vl.textContent='Seite vorlesen';vl.setAttribute('aria-pressed','false');};
      s.speak(u); vl.textContent='Vorlesen stoppen'; vl.setAttribute('aria-pressed','true');
    });
  }

  /* ---------- Formular ---------- */
  var f=document.getElementById('formular');
  if(f){
    var bf=document.getElementById('bewerbung-felder');
    function weiche(){bf.hidden=f.querySelector('input[name=art]:checked').value!=='bewerbung';}
    f.addEventListener('change',function(e){if(e.target.name==='art') weiche();});
    document.querySelectorAll('.stelle').forEach(function(btn){
      btn.addEventListener('click',function(){
        f.querySelector('input[name=art][value=bewerbung]').checked=true; weiche();
        var r=f.querySelector('input[name=stelle][value="'+btn.dataset.stelle+'"]'); if(r) r.checked=true;
        document.getElementById('nachricht').scrollIntoView({behavior:html.dataset.ruhe?'auto':'smooth'});
        setTimeout(function(){document.getElementById('kontakt').focus({preventScroll:true});},400);
      });
    });
    f.addEventListener('submit',function(e){
      e.preventDefault();
      var k=document.getElementById('kontakt'), fe=document.getElementById('kontakt-fehler');
      var v=k.value.trim(), ok=/@.+\./.test(v)||/[0-9][0-9 \/\-+()]{5,}/.test(v);
      if(!ok){k.setAttribute('aria-invalid','true');fe.hidden=false;k.focus();return;}
      k.removeAttribute('aria-invalid');fe.hidden=true;
      var d=document.getElementById('danke'); d.hidden=false; d.focus();
    });
  }

  /* ---------- Sanftes Einblenden ---------- */
  if('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    var els=document.querySelectorAll('.abschnitt__kopf, .weg, .schritt, .ortkarte, .notkarte, .zeitlinie, .meldung, .stelle, .formular');
    var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('ist-da');io.unobserve(en.target);}});},{rootMargin:'0px 0px -8% 0px'});
    els.forEach(function(el,i){var r=el.getBoundingClientRect(); if(r.top<window.innerHeight) return; el.classList.add('zeigen'); el.style.transitionDelay=((i%5)*60)+'ms'; io.observe(el);});
  }
})();
