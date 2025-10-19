  
  (function(){
    'use strict';

    /** -----------------------------
     * Utility Helpers
     * ------------------------------ */
    const $ = (sel, root=document) => root.querySelector(sel);
    const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
    const announce = (msg) => { const live = $('#liveRegion'); live.textContent = msg; };
    const copyToClipboard = async (text) => {
      try { await navigator.clipboard.writeText(text); toast('Copied'); }
      catch { fallbackCopy(text); }
    };
    function fallbackCopy(text){
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('Copied'); } catch {}
      ta.remove();
    }
    function toast(msg){
      const t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#2b2b45;color:#fff;padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.1);box-shadow:0 10px 30px rgba(0,0,0,.4);z-index:100';
      document.body.appendChild(t);
      setTimeout(()=>t.remove(),1200);
    }
    const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

    /** -----------------------------
     * Global Search (filters tools)
     * ------------------------------ */
    const searchInput = $('#globalSearch');
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      $$('#toolsGrid > .card').forEach(card => {
        const tags = (card.dataset.tags || '') + ' ' + (card.querySelector('h3')?.textContent || '');
        card.style.display = tags.toLowerCase().includes(q) ? '' : 'none';
      });
    });

    /** -----------------------------
     * Command Palette (Ctrl/Cmd + K)
     * ------------------------------ */
    const modal = $('#paletteModal');
    const openPaletteBtn = $('#openPalette');
    const paletteInput = $('#paletteInput');
    const paletteList = $('#paletteList');
    const cards = $$('#toolsGrid > .card');
    const tools = cards.map(c => ({
      id: c.id, title: c.querySelector('h3').textContent, tags: c.dataset.tags || ''
    }));

    function openPalette(){
      renderPalette('');
      modal.setAttribute('open','');
      paletteInput.value = '';
      setTimeout(()=> paletteInput.focus(), 0);
    }
    function closePalette(){ modal.removeAttribute('open'); openPaletteBtn.focus(); }

    function renderPalette(query){
      paletteList.innerHTML = '';
      const q = query.trim().toLowerCase();
      const filtered = tools.filter(t => (t.title + ' ' + t.tags).toLowerCase().includes(q));
      filtered.forEach((t,i)=>{
        const item = document.createElement('div');
        item.className = 'item';
        item.setAttribute('role','option');
        item.setAttribute('tabindex','-1');
        if(i===0) item.setAttribute('aria-selected','true');
        item.innerHTML = `<span>${t.title}</span><span class="kbd">Enter</span>`;
        item.addEventListener('click', ()=> jumpTo(t.id));
        paletteList.appendChild(item);
      });
      if(filtered.length===0){
        const none = document.createElement('div');
        none.className='item'; none.textContent='No results…';
        paletteList.appendChild(none);
      }
    }
    function jumpTo(id){
      closePalette();
      const el = document.getElementById(id);
      if(!el) return;
      el.scrollIntoView({behavior:'smooth', block:'center'});
      el.classList.add('highlight');
      setTimeout(()=> el.classList.remove('highlight'), 1200);
      el.focus({preventScroll:true});
    }
    openPaletteBtn.addEventListener('click', openPalette);
    document.addEventListener('keydown', (e)=>{
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); openPalette(); }
      if(e.key==='Escape' && modal.hasAttribute('open')){ e.preventDefault(); closePalette(); }
      if(modal.hasAttribute('open')){
        const items = $$('.item', paletteList).filter(i=>i.getAttribute('role')==='option');
        let idx = items.findIndex(i=>i.getAttribute('aria-selected')==='true');
        if(e.key==='ArrowDown'){ e.preventDefault(); idx = clamp(idx+1,0,items.length-1); items.forEach(i=>i.setAttribute('aria-selected','false')); items[idx]?.setAttribute('aria-selected','true'); items[idx]?.scrollIntoView({block:'nearest'}); }
        if(e.key==='ArrowUp'){ e.preventDefault(); idx = clamp(idx-1,0,items.length-1); items.forEach(i=>i.setAttribute('aria-selected','false')); items[idx]?.setAttribute('aria-selected','true'); items[idx]?.scrollIntoView({block:'nearest'}); }
        if(e.key==='Enter'){ e.preventDefault(); const sel = items.find(i=>i.getAttribute('aria-selected')==='true'); const text = sel?.querySelector('span')?.textContent; const found = tools.find(t=>t.title===text); if(found) jumpTo(found.id); }
      }
    });
    paletteInput.addEventListener('input', e => renderPalette(e.target.value));
    modal.addEventListener('click', (e)=> { if(e.target===modal) closePalette(); });

    /** -----------------------------
     * 1. Calculator
     * ------------------------------ */
    const calcExpr = $('#calcExpr'), calcOut = $('#calcOut .stat');
    function evaluate(){
      let expr = calcExpr.value.trim();
      if(!expr){ calcOut.textContent='—'; return; }
      expr = expr.replace(/×/g,'*').replace(/÷/g,'/'); // allow × ÷
      // Very safe evaluator: only digits, ops, parentheses, decimal, spaces
      if(!/^[0-9+\-*/().\s]+$/.test(expr)){ calcOut.textContent='Invalid characters'; return; }
      try{
        // eslint-disable-next-line no-new-func
        const result = Function('"use strict"; return ('+expr+')')();
        calcOut.textContent = (Number.isFinite(result) ? result : 'Error');
      }catch{ calcOut.textContent='Error'; }
    }
    $('#calcEval').addEventListener('click', evaluate);
    calcExpr.addEventListener('keydown', e=>{ if(e.key==='Enter') evaluate(); });

    /** -----------------------------
     * 2. Unit Converter
     * ------------------------------ */
    const unitType = $('#unitType'), unitFrom=$('#unitFrom'), unitTo=$('#unitTo'), unitInput=$('#unitInput'), unitOut=$('#unitOut');
    const UNIT_MAP = {
      length: { base:'m', units:{
        m:1, km:1000, cm:0.01, mm:0.001, in:0.0254, ft:0.3048, yd:0.9144, mi:1609.344
      }},
      weight: { base:'g', units:{
        g:1, kg:1000, lb:453.59237, oz:28.349523125
      }},
      temperature: { base:'C', units:{ C:'C', F:'F', K:'K' } }
    };
    function fillUnits(){
      const type=unitType.value; const {units}=UNIT_MAP[type];
      const opts = Object.keys(units).map(u=>`<option value="${u}">${u}</option>`).join('');
      unitFrom.innerHTML = opts; unitTo.innerHTML = opts;
      unitFrom.value = Object.keys(units)[0]; unitTo.value = Object.keys(units)[1] || Object.keys(units)[0];
    }
    function convert(){
      const type=unitType.value, from=unitFrom.value, to=unitTo.value, val=parseFloat(unitInput.value);
      if(Number.isNaN(val)){ unitOut.textContent='Enter a value'; return;}
      let result;
      if(type!=='temperature'){
        const map=UNIT_MAP[type].units;
        result = val * map[from] / map[to];
      }else{
        // Convert temp via C
        let C;
        if(from==='C') C = val;
        if(from==='F') C = (val-32)*5/9;
        if(from==='K') C = val-273.15;
        if(to==='C') result = C;
        if(to==='F') result = C*9/5+32;
        if(to==='K') result = C+273.15;
      }
      unitOut.textContent = `${val} ${from} = ${(+result.toFixed(6)).toString()} ${to}`;
    }
    $('#unitConvert').addEventListener('click', convert);
    $('#unitSwap').addEventListener('click', ()=>{ const f=unitFrom.value; unitFrom.value=unitTo.value; unitTo.value=f; convert(); });
    unitType.addEventListener('change', ()=>{ fillUnits(); unitOut.textContent='—'; });
    fillUnits();

    /** -----------------------------
     * 3. Text Utilities
     * ------------------------------ */
    const textArea = $('#textInput'), textStats=$('#textStats');
    function stats(){
      const t=textArea.value;
      const words = (t.trim().match(/\S+/g)||[]).length;
      const chars = t.length;
      const lines = t.split(/\n/).length;
      textStats.textContent = `Words: ${words} • Characters: ${chars} • Lines: ${lines}`;
    }
    textArea.addEventListener('input', stats); stats();
    $('#toUpper').addEventListener('click', ()=>{ textArea.value = textArea.value.toUpperCase(); stats(); });
    $('#toLower').addEventListener('click', ()=>{ textArea.value = textArea.value.toLowerCase(); stats(); });
    $('#trimSpaces').addEventListener('click', ()=>{
      textArea.value = textArea.value.replace(/[ \t]+/g,' ').replace(/\s+\n/g,'\n').trim();
      stats();
    });
    $('#reverseText').addEventListener('click', ()=>{
      textArea.value = textArea.value.split('\n').reverse().join('\n');
      stats();
    });
    $('#wordCount').addEventListener('click', stats);
    $('#copyText').addEventListener('click', ()=> copyToClipboard(textArea.value));

    /** -----------------------------
     * 4. Base64 Encode/Decode (UTF-8 safe)
     * ------------------------------ */
    const b64In=$('#b64In'), b64Out=$('#b64Out');
    function utf8ToB64(str){ return btoa(unescape(encodeURIComponent(str))); }
    function b64ToUtf8(str){ return decodeURIComponent(escape(atob(str))); }
    $('#b64Encode').addEventListener('click', ()=>{ try{ b64Out.value = utf8ToB64(b64In.value); }catch{ b64Out.value='Error'; } });
    $('#b64Decode').addEventListener('click', ()=>{ try{ b64Out.value = b64ToUtf8(b64In.value); }catch{ b64Out.value='Error'; } });
    $('#b64Copy').addEventListener('click', ()=> copyToClipboard(b64Out.value));
    $('#b64Clear').addEventListener('click', ()=>{ b64In.value=''; b64Out.value=''; });

    /** -----------------------------
     * 5. URL Encode/Decode
     * ------------------------------ */
    $('#urlEncode').addEventListener('click', ()=> $('#urlOut').value = encodeURIComponent($('#urlIn').value));
    $('#urlDecode').addEventListener('click', ()=>{ try{ $('#urlOut').value = decodeURIComponent($('#urlIn').value);}catch{ $('#urlOut').value='Invalid encoding'; } });
    $('#urlCopy').addEventListener('click', ()=> copyToClipboard($('#urlOut').value));

    /** -----------------------------
     * 6. JSON Formatter/Validator
     * ------------------------------ */
    const jsonIn=$('#jsonIn'), jsonOut=$('#jsonOut');
    $('#jsonFormat').addEventListener('click', ()=>{
      try{ const obj=JSON.parse(jsonIn.value); jsonOut.textContent = JSON.stringify(obj,null,2); announce('JSON formatted'); }
      catch(e){ jsonOut.textContent = 'Error: '+e.message; }
    });
    $('#jsonMinify').addEventListener('click', ()=>{
      try{ const obj=JSON.parse(jsonIn.value); jsonOut.textContent = JSON.stringify(obj); announce('JSON minified'); }
      catch(e){ jsonOut.textContent = 'Error: '+e.message; }
    });
    $('#jsonValidate').addEventListener('click', ()=>{
      try{ JSON.parse(jsonIn.value); jsonOut.textContent = 'Valid JSON ✅'; }
      catch(e){ jsonOut.textContent = 'Invalid JSON ❌ — '+e.message; }
    });
    $('#jsonCopy').addEventListener('click', ()=> copyToClipboard(jsonOut.textContent));
    $('#jsonClear').addEventListener('click', ()=>{ jsonIn.value=''; jsonOut.textContent=''; });

    /** -----------------------------
     * 7. Password Generator
     * ------------------------------ */
    const passLen=$('#passLen'), passLenVal=$('#passLenVal'), passOut=$('#passOut');
    const sets = {
      lower: 'abcdefghijklmnopqrstuvwxyz',
      upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      num:   '0123456789',
      sym:   '!@#$%^&*()_+-=[]{}|;:,.<>/?~',
    };
    function generatePassword(){
      const length = +passLen.value;
      const include = {
        lower: $('#passLower').checked,
        upper: $('#passUpper').checked,
        num: $('#passNum').checked,
        sym: $('#passSym').checked
      };
      let pool = '';
      for(const k in include) if(include[k]) pool += sets[k];
      if($('#passAmbig').checked) pool = pool.replace(/[O0Il|`'" ]/g,'');
      if(!pool){ passOut.value='Select at least one set'; return; }
      const arr = new Uint32Array(length);
      crypto.getRandomValues(arr);
      let pwd = '';
      for(let i=0;i<length;i++) pwd += pool[arr[i] % pool.length];
      passOut.value = pwd;
      passStrength.textContent = 'Strength: ' + estimateStrength(pwd);
    }
    function estimateStrength(pwd){
      // Simple estimator based on entropy bits ~ log2(pool^len)= len*log2(poolSize)
      const unique = new Set(pwd).size || 1;
      const bits = Math.round(pwd.length * Math.log2(unique));
      if(bits<40) return `Weak (${bits} bits)`;
      if(bits<60) return `Okay (${bits} bits)`;
      if(bits<80) return `Strong (${bits} bits)`;
      return `Very Strong (${bits}+ bits)`;
    }
    passLen.addEventListener('input', ()=> passLenVal.textContent = passLen.value);
    $('#passGen').addEventListener('click', generatePassword);
    $('#passCopy').addEventListener('click', ()=> copyToClipboard(passOut.value));
    // initial
    generatePassword();

    /** -----------------------------
     * 8. UUID v4
     * ------------------------------ */
    function uuidv4(){
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
      const hex = [...bytes].map(b=>b.toString(16).padStart(2,'0'));
      return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
    }
    $('#uuidGen').addEventListener('click', ()=> $('#uuidOut').value = uuidv4());
    $('#uuidCopy').addEventListener('click', ()=> copyToClipboard($('#uuidOut').value));
    // initial
    $('#uuidOut').value = uuidv4();

    /** -----------------------------
     * 9. Hash Generator (SHA-256)
     * ------------------------------ */
    async function sha256(text){
      const enc = new TextEncoder();
      const hash = await crypto.subtle.digest('SHA-256', enc.encode(text));
      return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
    }
    $('#hashBtn').addEventListener('click', async ()=>{
      const input = $('#hashIn').value;
      $('#hashOut').value = 'Computing…';
      $('#hashOut').value = await sha256(input);
    });
    $('#hashCopy').addEventListener('click', ()=> copyToClipboard($('#hashOut').value));

    /** -----------------------------
     * 10. Image Resizer & Compressor (Canvas)
     * ------------------------------ */
    const imgFile=$('#imgFile'), imgW=$('#imgW'), imgH=$('#imgH'), imgQ=$('#imgQ'), imgType=$('#imgType'),
          imgLock=$('#imgLock'), imgCanvas=$('#imgCanvas'), imgMeta=$('#imgMeta'),
          imgPreviewSrc=$('#imgPreviewSrc'), imgPreviewOut=$('#imgPreviewOut');
    let original = new Image(), originalW=0, originalH=0, outputBlob=null;

    imgFile.addEventListener('change', async ()=>{
      const file = imgFile.files?.[0]; if(!file) return;
      const url = URL.createObjectURL(file);
      original = new Image();
      original.onload = ()=>{
        originalW = original.naturalWidth; originalH = original.naturalHeight;
        imgW.value = originalW; imgH.value = originalH;
        imgPreviewSrc.src = url; imgPreviewOut.src = '';
        imgMeta.textContent = `Original: ${file.type} • ${originalW}×${originalH} • ${(file.size/1024).toFixed(1)} KB`;
        URL.revokeObjectURL(url);
      };
      original.src = url;
    });
    imgW.addEventListener('input', ()=>{
      if(imgLock.checked && originalW>0){ imgH.value = Math.round(originalH * (imgW.value/originalW)); }
    });
    imgH.addEventListener('input', ()=>{
      if(imgLock.checked && originalH>0){ imgW.value = Math.round(originalW * (imgH.value/originalH)); }
    });
    $('#imgProcess').addEventListener('click', ()=>{
      if(!originalW){ toast('Choose an image'); return; }
      const w = Math.max(1, +imgW.value|0), h = Math.max(1, +imgH.value|0);
      const type = imgType.value, q = parseFloat(imgQ.value);
      imgCanvas.width = w; imgCanvas.height = h;
      const ctx = imgCanvas.getContext('2d');
      ctx.clearRect(0,0,w,h);
      ctx.drawImage(original, 0, 0, w, h);
      imgCanvas.toBlob((blob)=>{
        outputBlob = blob;
        imgPreviewOut.src = URL.createObjectURL(blob);
        imgMeta.textContent += ` • Output: ${type} • ${w}×${h} • ${blob ? (blob.size/1024).toFixed(1) : '?'} KB`;
        $('#imgDownload').disabled = !blob;
      }, type, type==='image/png' ? undefined : q);
    });
    $('#imgDownload').addEventListener('click', ()=>{
      if(!outputBlob) return;
      const a = document.createElement('a');
      a.download = `tools-pack.${imgType.value.split('/')[1]}`;
      a.href = URL.createObjectURL(outputBlob);
      a.click();
      setTimeout(()=> URL.revokeObjectURL(a.href), 1000);
    });

    /** -----------------------------
     * 11. Color Picker + Contrast Checker (WCAG)
     * ------------------------------ */
    const fgColor=$('#fgColor'), bgColor=$('#bgColor'), contrastOut=$('#contrastOut'), contrastPreview=$('#contrastPreview');
    function hexToRgb(hex){
      hex = hex.replace('#','');
      if(hex.length===3) hex = hex.split('').map(c=>c+c).join('');
      const num = parseInt(hex,16);
      return [ (num>>16)&255, (num>>8)&255, num&255 ];
    }
    function luminance([r,g,b]){
      const a=[r,g,b].map(v=>{
        v/=255;
        return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4);
      });
      return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];
    }
    function contrastRatio(fg,bg){
      const L1 = luminance(hexToRgb(fg))+0.05;
      const L2 = luminance(hexToRgb(bg))+0.05;
      const ratio = L1>L2 ? L1/L2 : L2/L1;
      return Math.round(ratio*100)/100;
    }
    function updateContrast(){
      const fg=fgColor.value, bg=bgColor.value, r=contrastRatio(fg,bg);
      contrastPreview.style.color = fg; contrastPreview.style.background = bg;
      $('#sampleText').textContent = `Aa — Sample Text (${fg.toUpperCase()} on ${bg.toUpperCase()})`;
      const passNormal = r>=4.5 ? 'Pass' : (r>=3 ? 'AA Large only' : 'Fail');
      const passAAA = r>=7 ? 'AAA' : (r>=4.5 ? 'AA' : '—');
      contrastOut.innerHTML = `Contrast: <b>${r}:1</b> • WCAG: <b>${passAAA}</b> (${passNormal})`;
    }
    fgColor.addEventListener('input', updateContrast);
    bgColor.addEventListener('input', updateContrast);
    updateContrast();

    /** -----------------------------
     * 12. Stopwatch & Countdown
     * ------------------------------ */
    const swDisplay=$('#stopwatchDisplay'), swStart=$('#swStart'), swStop=$('#swStop'), swReset=$('#swReset'), swLap=$('#swLap'), swLaps=$('#swLaps');
    let swStartTs=0, swElapsed=0, swTimer=null, laps=[];
    function fmtMs(ms){
      const m = Math.floor(ms/60000).toString().padStart(2,'0');
      const s = Math.floor((ms%60000)/1000).toString().padStart(2,'0');
      const cs = Math.floor((ms%1000)/10).toString().padStart(2,'0');
      return `${m}:${s}.${cs}`;
    }
    function tick(){
      const now = performance.now();
      swDisplay.textContent = fmtMs(swElapsed + (now - swStartTs));
      swTimer = requestAnimationFrame(tick);
    }
    swStart.addEventListener('click', ()=>{
      if(swTimer) return;
      swStartTs = performance.now();
      swTimer = requestAnimationFrame(tick);
    });
    swStop.addEventListener('click', ()=>{
      if(!swTimer) return;
      cancelAnimationFrame(swTimer); swTimer=null;
      swElapsed += performance.now() - swStartTs;
      swDisplay.textContent = fmtMs(swElapsed);
    });
    swReset.addEventListener('click', ()=>{
      if(swTimer){ cancelAnimationFrame(swTimer); swTimer=null; }
      swElapsed=0; laps=[]; swDisplay.textContent='00:00.00'; swLaps.textContent='Laps: —';
    });
    swLap.addEventListener('click', ()=>{
      const t = swTimer ? fmtMs(swElapsed + (performance.now()-swStartTs)) : fmtMs(swElapsed);
      laps.push(t);
      swLaps.textContent = 'Laps: ' + laps.map((l,i)=>`#${i+1} ${l}`).join(' • ');
    });

    // Countdown
    const cdMin=$('#cdMin'), cdSec=$('#cdSec'), cdStart=$('#cdStart'), cdPause=$('#cdPause'), cdReset=$('#cdReset'), cdDisplay=$('#countdownDisplay');
    let cdRemaining=0, cdInterval=null;
    function updateCdDisplay(){
      const m = Math.floor(cdRemaining/60).toString().padStart(2,'0');
      const s = Math.floor(cdRemaining%60).toString().padStart(2,'0');
      cdDisplay.textContent = `${m}:${s}`;
    }
    cdStart.addEventListener('click', ()=>{
      if(cdInterval) return;
      if(cdRemaining<=0){
        cdRemaining = (+cdMin.value|0)*60 + (+cdSec.value|0);
      }
      if(cdRemaining<=0){ toast('Set a time'); return; }
      cdInterval = setInterval(()=>{
        cdRemaining--;
        updateCdDisplay();
        if(cdRemaining<=0){
          clearInterval(cdInterval); cdInterval=null;
          updateCdDisplay();
          try{ new AudioContext().resume().then(()=>{}); }catch{}
          // Simple beep
          const ctx = new (window.AudioContext||window.webkitAudioContext)();
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.type='sine'; o.frequency.value=880; o.connect(g); g.connect(ctx.destination);
          g.gain.setValueAtTime(0.001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime+.02);
          o.start();
          setTimeout(()=>{ g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+.2); o.stop(ctx.currentTime+.25); }, 230);
          toast('Time’s up!');
        }
      },1000);
    });
    cdPause.addEventListener('click', ()=>{ if(cdInterval){ clearInterval(cdInterval); cdInterval=null; } });
    cdReset.addEventListener('click', ()=>{ if(cdInterval){ clearInterval(cdInterval); cdInterval=null; } cdRemaining=0; updateCdDisplay(); });
    updateCdDisplay();

    /** -----------------------------
     * 13. Quick Notes (localStorage)
     * ------------------------------ */
    const notesKey='toolspack.notes.v1', notesTitle=$('#notesTitle'), notesArea=$('#notesArea'), notesSaved=$('#notesSaved');
    function saveNotes(){
      const data = { title: notesTitle.value, content: notesArea.value, ts: Date.now() };
      localStorage.setItem(notesKey, JSON.stringify(data));
      notesSaved.textContent = 'Saved • '+ new Date(data.ts).toLocaleString();
    }
    function loadNotes(){
      try{
        const str=localStorage.getItem(notesKey);
        if(!str) return;
        const data=JSON.parse(str);
        notesTitle.value = data.title||''; notesArea.value=data.content||'';
        notesSaved.textContent = 'Loaded • '+ new Date(data.ts).toLocaleString();
      }catch{}
    }
    notesTitle.addEventListener('input', ()=>{ saveNotes(); });
    notesArea.addEventListener('input', ()=>{ saveNotes(); });
    $('#notesExport').addEventListener('click', ()=>{
      const blob = new Blob([localStorage.getItem(notesKey)||'{}'], {type:'application/json'});
      const a = document.createElement('a'); a.download='tools-pack-notes.json'; a.href=URL.createObjectURL(blob); a.click();
      setTimeout(()=> URL.revokeObjectURL(a.href), 1000);
    });
    $('#notesImport').addEventListener('change', ()=>{
      const file = $('#notesImport').files?.[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = ()=>{ try{
        const data = JSON.parse(reader.result);
        if(!('content' in data)){ toast('Invalid file'); return; }
        localStorage.setItem(notesKey, JSON.stringify(data));
        loadNotes();
        toast('Imported');
      }catch{ toast('Invalid file'); } };
      reader.readAsText(file);
    });
    $('#notesClear').addEventListener('click', ()=>{
      if(confirm('Clear notes?')){ localStorage.removeItem(notesKey); notesTitle.value=''; notesArea.value=''; notesSaved.textContent='Cleared.'; }
    });
    loadNotes();

    /** -----------------------------
     * Accessibility and polish
     * ------------------------------ */
    // Focus outlines on keyboard only
    function handleFirstTab(e){ if(e.key==='Tab'){ document.body.classList.add('user-is-tabbing'); window.removeEventListener('keydown', handleFirstTab); } }
    window.addEventListener('keydown', handleFirstTab);
    // Smooth anchor focus highlight
    const style = document.createElement('style');
    style.textContent = `.highlight{outline:2px solid var(--accent); box-shadow: var(--focus) !important}`;
    document.head.appendChild(style);
  })();