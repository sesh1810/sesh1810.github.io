/* ============================================================
   Alapana Mirror — alapana.v2.js
   Sing a phrase with gamakas. The violin answers — gamakas intact.
   Continuous pitch contour capture -> continuous-pitch violin synth.
   No quantization anywhere. Built for sesh1810.github.io.
   ============================================================ */
(function(){
'use strict';
window.AM = window.AM || {};
var AM = window.AM;
AM.bootStage='start';

var CSS = `
:root{
  --bg:#0a0908; --panel:#171310; --ink:#f5f1ea; --dim:#a89f92; --faint:#6b6257;
  --amber:#e8b464; --amber2:#d98443; --voice:#4da3ff; --violin:#e8b464; --ok:#46d17c; --warn:#ffc24d; --bad:#ff5d5d;
  --disp:'Space Grotesk','Inter',system-ui,sans-serif;
  --body:'Inter',system-ui,-apple-system,sans-serif;
  --mono:'JetBrains Mono',ui-monospace,Menlo,monospace;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:var(--bg);color:var(--ink);font-family:var(--body);overflow:hidden;-webkit-font-smoothing:antialiased}
button{font-family:inherit;cursor:pointer}
a{color:var(--amber);text-decoration:none}
#vcv{position:fixed;inset:0;z-index:0}
.ui{position:fixed;z-index:5}
.hidden{display:none!important}
.fadein{animation:fi .45s ease both}
@keyframes fi{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.corner{top:16px;left:18px;font-size:13px}
.corner-r{top:16px;right:18px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end;max-width:60vw}
select{background:var(--panel);color:var(--ink);border:1px solid rgba(255,255,255,.15);border-radius:9px;padding:6px 8px;font-size:12px;font-family:var(--mono)}
.lab-mini{font-family:var(--mono);font-size:10px;color:var(--faint)}
.btn-line{background:none;border:1px solid rgba(255,255,255,.16);color:var(--dim);border-radius:12px;padding:11px 20px;font-size:13.5px}
.btn-line:hover{color:var(--ink);border-color:rgba(255,255,255,.34)}
.btn-line.on{color:var(--amber);border-color:var(--amber)}
.btn-big{font-family:var(--disp);font-weight:700;font-size:16px;color:#1c1208;border:none;border-radius:14px;padding:14px 30px;background:linear-gradient(135deg,var(--amber),var(--amber2));box-shadow:0 6px 30px rgba(232,180,100,.3);transition:transform .15s}
.btn-big:hover{transform:translateY(-2px)}
.btn-big:active{transform:scale(.97)}
.btn-big:disabled{opacity:.35;transform:none;box-shadow:none;cursor:default}

/* home */
#scr-home{inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:20px;background:radial-gradient(1000px 600px at 50% 20%,rgba(232,180,100,0.07),transparent 65%)}
#scr-home h1{font-family:var(--disp);font-weight:700;font-size:clamp(32px,7vw,54px);letter-spacing:-1px;line-height:1.12}
#scr-home h1 .grad{background:linear-gradient(90deg,var(--amber),var(--amber2));-webkit-background-clip:text;background-clip:text;color:transparent}
#scr-home .tag{color:var(--dim);margin:14px auto 28px;font-size:clamp(14px,2.4vw,16.5px);max-width:520px;line-height:1.6}
#mic-note{font-family:var(--mono);font-size:11.5px;color:var(--faint);margin-top:16px}

/* hud */
#top-hud{top:14px;left:50%;transform:translateX(-50%);text-align:center;pointer-events:none;max-width:82vw}
#top-hud h2{font-family:var(--disp);font-size:clamp(15px,3.4vw,21px);font-weight:700}
#top-hud .sub{color:var(--dim);font-size:12.5px;margin-top:3px}

/* live svara readout */
#live{top:72px;left:50%;transform:translateX(-50%);text-align:center;pointer-events:none}
#live-sv{font-family:var(--disp);font-weight:700;font-size:40px;min-height:48px;line-height:1;color:var(--voice)}
#live-sv.violin{color:var(--violin)}
#live-sv small{font-size:15px;color:var(--dim);font-weight:500}

/* raga card */
#raga-card{left:50%;transform:translateX(-50%);bottom:108px;width:min(520px,94vw);
  background:rgba(23,19,16,.88);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  border:1px solid rgba(232,180,100,.28);border-radius:16px;padding:15px 18px;
  box-shadow:0 14px 46px rgba(0,0,0,.55)}
#raga-card.thinking{opacity:.6}
#rg-q{font-family:var(--disp);font-weight:700;font-size:clamp(17px,3.6vw,22px);line-height:1.25}
#rg-q .nm{background:linear-gradient(90deg,var(--amber),var(--amber2));-webkit-background-clip:text;background-clip:text;color:transparent}
#rg-bar{position:relative;height:7px;background:rgba(255,255,255,.09);border-radius:99px;margin:10px 0 7px;overflow:hidden}
#rg-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--amber2),var(--amber));transition:width .7s cubic-bezier(.2,.8,.2,1)}
#rg-conf{font-family:var(--mono);font-size:11px;color:var(--dim)}
#rg-heard{font-family:var(--mono);font-size:11px;color:var(--faint);margin-top:7px;line-height:1.5}
#rg-heard b{color:var(--amber);font-weight:400}
#rg-alts{font-size:12px;color:var(--dim);margin-top:7px}
#rg-alts span{color:var(--ink)}

/* controls */
#controls{bottom:22px;left:50%;transform:translateX(-50%);display:flex;gap:11px;align-items:center}
#btn-rec{width:70px;height:70px;border-radius:50%;border:none;background:radial-gradient(circle at 35% 30%,#ff7a6a,#d84433);box-shadow:0 6px 26px rgba(255,93,93,.35);color:#fff;font-size:25px;transition:transform .15s}
#btn-rec:active{transform:scale(.94)}
#btn-rec.listening{animation:pulse 1.2s ease-in-out infinite}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,93,93,.45)}50%{box-shadow:0 0 0 16px rgba(255,93,93,0)}}

#toasts{position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:50;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none}
.toast{background:var(--panel);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:8px 18px;font-size:13px;animation:tst 2.6s ease both}
@keyframes tst{0%{opacity:0;transform:translateY(-8px)}12%{opacity:1}82%{opacity:1}100%{opacity:0}}

@media(max-width:640px){
  #raga-card{bottom:104px;padding:13px 15px}
  .corner-r .lab-mini{display:none}
}
`;

function injectCSS(){
  var s=document.createElement('style'); s.textContent=CSS; document.head.appendChild(s);
  var l=document.createElement('link'); l.rel='stylesheet';
  l.href='https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;700&display=swap';
  document.head.appendChild(l);
}

var $=function(id){ return document.getElementById(id); };
function buildDOM(){
  document.body.insertAdjacentHTML('beforeend',
    '<canvas id="vcv"></canvas>' +
    '<a class="ui corner" href="index.html">\u2190 Back to Portfolio</a>' +
    '<div class="ui corner-r">' +
      '<span class="lab-mini">sruti</span>' +
      '<select id="sel-sruti"><option value="0">C (1)</option><option value="1">C# (1\u00bd)</option><option value="2" selected>D (2)</option><option value="3">D# (2\u00bd)</option><option value="4">E (3)</option><option value="5">F (4)</option><option value="6">F# (4\u00bd)</option><option value="7">G (5)</option><option value="8">G# (5\u00bd)</option><option value="9">A (6)</option><option value="10">A# (6\u00bd)</option><option value="11">B (7)</option></select>' +
      '<button class="btn-line" id="btn-drone" style="padding:6px 12px;font-size:12px" title="Tanpura-style Sa-Pa drone">\uD83E\uDE95 drone</button>' +
      '<span class="lab-mini">violin plays</span>' +
      '<select id="sel-oct"><option value="0" selected>as sung</option><option value="12">octave up</option><option value="-12">octave down</option></select>' +
    '</div>' +

    '<div id="scr-home" class="ui fadein">' +
      '<h1>alapana <span class="grad">mirror</span></h1>' +
      '<div class="tag">Sing a phrase the way you\u2019d sing it in a concert \u2014 gamakas, slides, everything. The violin listens and gives it back to you exactly as you sang it, the way a concert violinist answers the vocalist. Nothing is snapped to notes.</div>' +
      '<button class="btn-big" id="btn-start">\uD83C\uDFBB Start</button>' +
      '<div id="mic-note">needs microphone \u00b7 all processing stays in your browser \u00b7 phrases up to ~14s</div>' +
    '</div>' +

    '<div id="top-hud" class="ui hidden">' +
      '<h2 id="hud-h">Sing your phrase</h2>' +
      '<div class="sub" id="hud-sub">tap the mic, sing with full gamakas, go quiet when done</div>' +
    '</div>' +
    '<div id="live" class="ui hidden"><div id="live-sv">\u2013</div></div>' +

    '<div id="raga-card" class="ui hidden">' +
      '<div id="rg-q">Sing a phrase and I\u2019ll guess the raga</div>' +
      '<div id="rg-bar"><i style="width:0%"></i></div>' +
      '<div id="rg-conf">\u2013</div>' +
      '<div id="rg-heard"></div>' +
      '<div id="rg-alts"></div>' +
    '</div>' +

    '<div id="controls" class="ui hidden">' +
      '<button class="btn-line" id="btn-clear">\u2715</button>' +
      '<button id="btn-rec" title="Sing">\uD83C\uDFA4</button>' +
      '<button class="btn-big" id="btn-play" disabled>\u25B6 Answer</button>' +
      '<button class="btn-line" id="btn-slow" disabled>\uD83D\uDC22 half speed</button>' +
    '</div>' +
    '<div id="toasts"></div>'
  );
}
function toast(msg){
  var t=document.createElement('div'); t.className='toast'; t.textContent=msg;
  $('toasts').appendChild(t); setTimeout(function(){ t.remove(); },2600);
}
/* ---------------- theory ---------------- */
var NOTE_NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
var SARGAM=['S','r','R','g','G','m','M','P','d','D','n','N'];
function freqToMidiFloat(f){ return 69 + 12*Math.log2(f/440); }
function midiToFreq(m){ return 440*Math.pow(2,(m-69)/12); }
function svaraOf(midiFloat, saPc){
  var m=Math.round(midiFloat);
  var off=((m%12)-saPc+12)%12;
  var oct=Math.floor((m-(saPc+60))/12);
  var s=SARGAM[off];
  if (oct>0) s=s+'\u0307';
  if (oct<0) s=s+'\u0323';
  return s;
}
AM.svaraOf=svaraOf;

/* ---------------- pitch detection (first-strong-peak ACF) ---------------- */
function detectPitch(buf, sr){
  var n=buf.length;
  var rms=0;
  for (var i=0;i<n;i++) rms+=buf[i]*buf[i];
  rms=Math.sqrt(rms/n);
  if (rms<0.012) return { freq:0, rms:rms, conf:0 };
  var mean=0; for (i=0;i<n;i++) mean+=buf[i]; mean/=n;
  var minLag=Math.floor(sr/900), maxLag=Math.min(Math.floor(sr/70), n>>1);
  var norm0=0;
  for (i=0;i<n;i++){ var v=buf[i]-mean; norm0+=v*v; }
  if (norm0===0) return { freq:0, rms:rms, conf:0 };
  var vals=new Float32Array(maxLag+1);
  var normPer=norm0/n, globalMax=0;
  for (var lag=minLag; lag<=maxLag; lag++){
    var s=0;
    for (i=0;i<n-lag;i++) s+=(buf[i]-mean)*(buf[i+lag]-mean);
    vals[lag]=(s/(n-lag))/normPer;
    if (vals[lag]>globalMax) globalMax=vals[lag];
  }
  if (globalMax<0.45) return { freq:0, rms:rms, conf:globalMax };
  var thresh=globalMax*0.92, bestLag=-1;
  for (lag=minLag; lag<=maxLag; lag++){
    if (vals[lag]>=thresh){
      while (lag<maxLag && vals[lag+1]>vals[lag]) lag++;
      bestLag=lag; break;
    }
  }
  var bestVal=vals[bestLag];
  var l=bestLag, y0=vals[l-1]||0, y1=vals[l], y2=vals[l+1]||0;
  var denom=(y0-2*y1+y2);
  var shift=denom!==0 ? 0.5*(y0-y2)/denom : 0;
  var lagF=l+Math.max(-0.5,Math.min(0.5,shift));
  return { freq:sr/lagF, rms:rms, conf:bestVal };
}
AM.detectPitch=detectPitch;

/* ---------------- contour post-processing ---------------- */
/* frames: [{f, rms}] at hopMs spacing (f=0 unvoiced).
   Returns { midi:Float32Array (NaN=silent), rms:Float32Array, hopMs, voicedSegs:[[i0,i1],...] } */
function processContour(frames, hopMs){
  var n=frames.length;
  var midi=new Float32Array(n), rms=new Float32Array(n);
  for (var i=0;i<n;i++){
    midi[i]=frames[i].f>0 ? freqToMidiFloat(frames[i].f) : NaN;
    rms[i]=frames[i].rms||0;
  }
  // conditional despike: only replace a frame that jumps away from BOTH neighbors
  // (kills octave blips without shaving genuine kampita oscillation peaks)
  var med=new Float32Array(n);
  for (i=0;i<n;i++) med[i]=midi[i];
  for (i=1;i<n-1;i++){
    var a=midi[i-1], b=midi[i], c=midi[i+1];
    if (isNaN(b)||isNaN(a)||isNaN(c)) continue;
    if (Math.abs(b-a)>1.5 && Math.abs(b-c)>1.5 && Math.abs(c-a)<1.2){
      med[i]=(a+c)/2;
    }
  }
  midi=med;
  // despike: a voiced frame jumping >4 semis from both neighbors is an artifact
  for (i=1;i<n-1;i++){
    if (!isNaN(midi[i]) && !isNaN(midi[i-1]) && !isNaN(midi[i+1])){
      if (Math.abs(midi[i]-midi[i-1])>4 && Math.abs(midi[i]-midi[i+1])>4 && Math.abs(midi[i+1]-midi[i-1])<2){
        midi[i]=(midi[i-1]+midi[i+1])/2;
      }
    }
  }
  // bridge short gaps (consonants) up to 140ms with linear interp; keep rms dip
  var maxGap=Math.round(140/hopMs);
  i=0;
  while (i<n){
    if (isNaN(midi[i])){
      var j=i;
      while (j<n && isNaN(midi[j])) j++;
      var gap=j-i;
      if (i>0 && j<n && gap<=maxGap){
        for (var k=0;k<gap;k++){
          var t=(k+1)/(gap+1);
          midi[i+k]=midi[i-1]*(1-t)+midi[j]*t;
        }
      }
      i=j;
    } else i++;
  }
  // trim leading/trailing silence (keep 3 frames padding)
  var s0=0; while (s0<n && isNaN(midi[s0])) s0++;
  var s1=n-1; while (s1>=0 && isNaN(midi[s1])) s1--;
  if (s0>=n) return null;
  s0=Math.max(0,s0-2); s1=Math.min(n-1,s1+2);
  midi=midi.slice(s0,s1+1); rms=rms.slice(s0,s1+1);
  n=midi.length;
  // voiced segments
  var segs=[]; i=0;
  while (i<n){
    if (!isNaN(midi[i])){
      var j2=i;
      while (j2<n && !isNaN(midi[j2])) j2++;
      if ((j2-i)*hopMs>=120) segs.push([i,j2-1]);
      i=j2;
    } else i++;
  }
  if (!segs.length) return null;
  return { midi:midi, rms:rms, hopMs:hopMs, segs:segs };
}
AM.processContour=processContour;

/* ---------------- strings: Sa-Pa-Sa-Pa at sruti ---------------- */
function stringMidis(saPc){
  var sa0=48+saPc;
  return [sa0, sa0+7, sa0+12, sa0+19];
}
function stringNames(){ return ['Sa\u0323','Pa\u0323','Sa','Pa']; }
AM.stringMidis=stringMidis;
AM.stringNames=stringNames;
/* string chooser with hysteresis against the current sruti's strings */
function chooseStrings(contour, octShift, saPc){
  var S=stringMidis(saPc);
  var n=contour.midi.length;
  var out=new Int8Array(n);
  var cur=-1;
  for (var i=0;i<n;i++){
    var m=contour.midi[i];
    if (isNaN(m)){ out[i]=cur<0?2:cur; continue; }
    m+=octShift;
    if (cur>=0){
      var off=m-S[cur];
      if (off>=-0.3 && off<=10.5){ out[i]=cur; continue; }
    }
    var pick=0;
    for (var s=S.length-1;s>=0;s--){
      if (m>=S[s]-0.3){ pick=s; break; }
    }
    cur=pick; out[i]=cur;
  }
  return out;
}
AM.chooseStrings=chooseStrings;

/* ---------------- mic ---------------- */
var MIC=(function(){
  var ctx=null, stream=null, analyser=null, buf=null, running=false, hopTimer=null;
  function ac(){
    if (!ctx){ var AC=window.AudioContext||window.webkitAudioContext; ctx=new AC(); }
    if (ctx.state==='suspended') ctx.resume();
    return ctx;
  }
  function start(onFrame, hopMs){
    return navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:false, noiseSuppression:false, autoGainControl:true } })
      .then(function(s){
        stream=s;
        var c=ac();
        var src=c.createMediaStreamSource(s);
        analyser=c.createAnalyser(); analyser.fftSize=2048;
        src.connect(analyser);
        buf=new Float32Array(analyser.fftSize);
        running=true;
        hopTimer=setInterval(function(){
          if (!running) return;
          analyser.getFloatTimeDomainData(buf);
          onFrame(detectPitch(buf, c.sampleRate));
        }, hopMs);
      });
  }
  function stop(){
    running=false;
    if (hopTimer){ clearInterval(hopTimer); hopTimer=null; }
    if (stream){ stream.getTracks().forEach(function(t){ t.stop(); }); stream=null; }
  }
  return { start:start, stop:stop, actx:ac, isRunning:function(){return running;} };
})();
AM.MIC=MIC;

/* ---------------- sruti drone (Sa + Pa, tanpura-flavored) ---------------- */
var DRONE=(function(){
  var nodes=null;
  function on(saPc){
    off();
    var c=MIC.actx();
    var saF=midiToFreq(48+saPc+12);   // madhya Sa region for the drone
    var g=c.createGain(); g.gain.value=0.0;
    g.connect(c.destination);
    g.gain.linearRampToValueAtTime(0.055, c.currentTime+1.2);
    var mk=function(f, amp){
      var o=c.createOscillator(); o.type='sawtooth'; o.frequency.value=f;
      var og=c.createGain(); og.gain.value=amp;
      var lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2200; lp.Q.value=0.6;
      o.connect(lp); lp.connect(og); og.connect(g);
      o.start();
      return o;
    };
    var os=[ mk(saF*0.5,0.5), mk(saF*0.75,0.35), mk(saF,0.45), mk(saF*1.002,0.2) ];
    nodes={ g:g, os:os };
  }
  function off(){
    if (!nodes) return;
    var c=MIC.actx();
    nodes.g.gain.linearRampToValueAtTime(0.0001, c.currentTime+0.5);
    var os=nodes.os;
    setTimeout(function(){ os.forEach(function(o){ try{o.stop();}catch(e){} }); },600);
    nodes=null;
  }
  return { on:on, off:off, isOn:function(){ return !!nodes; } };
})();
AM.DRONE=DRONE;
/* ---------------- violin synth v3: physical model ----------------
   The v2 synth stacked detuned sawtooths — that is a synthesizer
   imitating a violin, and ears hear it. This models the instrument
   instead: a string as a delay loop, a bow with real stick-slip
   friction, a lossy bridge reflection, and a wooden body.

   Two consequences worth knowing:
   - gamaka becomes physical. Changing pitch changes the loop length,
     which is literally what your finger does to the string, so slides
     behave like slides instead of like an oscillator being retuned.
   - loudness and timbre couple the way a bow does: press harder and
     it gets louder AND brighter, because the friction changes. */
var VSYNTH=(function(){
  var wlReady=false, wlTried=false, bodyIR=null, roomIR=null, current=null;

  /* --- the worklet: one bowed string, sample by sample --- */
  var WL=[
'class BowedProcessor extends AudioWorkletProcessor {',
'  static get parameterDescriptors(){ return [',
'    {name:"frequency",   defaultValue:220, minValue:40, maxValue:2200, automationRate:"a-rate"},',
'    {name:"bowVelocity", defaultValue:0,   minValue:0,  maxValue:1,    automationRate:"a-rate"},',
'    {name:"bowForce",    defaultValue:3,   minValue:0.8,maxValue:6,    automationRate:"k-rate"},',
'    {name:"bowPos",      defaultValue:0.11,minValue:0.04,maxValue:0.3, automationRate:"k-rate"},',
'    {name:"tone",        defaultValue:0.78,minValue:0.5,maxValue:0.95, automationRate:"k-rate"},',
'    {name:"damping",     defaultValue:0.99,minValue:0.9,maxValue:0.999,automationRate:"k-rate"}',
'  ]; }',
'  constructor(){',
'    super();',
'    this.N=Math.ceil(sampleRate/35);',
'    this.neck=new Float32Array(this.N);',
'    this.bridge=new Float32Array(this.N);',
'    this.np=0; this.bp=0;',
'    this.neckLen=200; this.bridgeLen=30;',
'    this.reflPrev=0; this.xPrev=0; this.yPrev=0;',
'    this.dead=0;',
'  }',
'  read(buf, ptr, len){',
'    var rp=ptr-len;',
'    while(rp<0) rp+=this.N;',
'    var i=Math.floor(rp), frac=rp-i;',
'    var a=buf[i], b=buf[(i+1)%this.N];',
'    return a+(b-a)*frac;',
'  }',
'  process(inputs, outputs, p){',
'    var out=outputs[0][0];',
'    var fA=p.frequency, vA=p.bowVelocity;',
'    var slope=p.bowForce[0], bpos=p.bowPos[0], tone=p.tone[0], damp=p.damping[0];',
'    var quiet=true;',
'    for (var i=0;i<out.length;i++){',
'      var f=fA.length>1?fA[i]:fA[0];',
'      var vel=vA.length>1?vA[i]:vA[0];',
'      if (vel>0.0004) quiet=false;',
'      var base=sampleRate/f - 0.25;',
'      this.bridgeLen=base*bpos; if(this.bridgeLen<2) this.bridgeLen=2;',
'      this.neckLen=base*(1-bpos); if(this.neckLen<2) this.neckLen=2;',
'      var bOut=this.read(this.bridge,this.bp,this.bridgeLen);',
'      var nOut=this.read(this.neck,this.np,this.neckLen);',
'      var filt=tone*bOut+(1-tone)*this.reflPrev;',
'      this.reflPrev=bOut;',
'      var bridgeRefl=-damp*filt;',
'      var nutRefl=-nOut;',
'      var dv=vel-(bridgeRefl+nutRefl);',
'      var g=Math.abs(dv*slope+0.001)+0.75;',
'      g=Math.pow(g,-4); if(g>1) g=1;',
'      var nv=dv*g;',
'      this.neck[this.np]=bridgeRefl+nv;',
'      this.bridge[this.bp]=nutRefl+nv;',
'      this.np=(this.np+1)%this.N;',
'      this.bp=(this.bp+1)%this.N;',
'      var y=bOut-this.xPrev+0.995*this.yPrev;',
'      this.xPrev=bOut; this.yPrev=y;',
'      if (y>2) y=2; else if (y<-2) y=-2;',
'      out[i]=y;',
'    }',
'    this.dead = quiet ? this.dead+1 : 0;',
'    return this.dead < 400;',
'  }',
'}',
'registerProcessor("bowed", BowedProcessor);'
].join('\n');

  function ensureWorklet(c){
    if (wlReady) return Promise.resolve(true);
    if (wlTried) return Promise.resolve(false);
    wlTried=true;
    if (!c.audioWorklet || !window.Blob || !window.URL || !URL.createObjectURL){
      return Promise.resolve(false);
    }
    try{
      var url=URL.createObjectURL(new Blob([WL],{type:'application/javascript'}));
      return c.audioWorklet.addModule(url).then(function(){
        wlReady=true; URL.revokeObjectURL(url); return true;
      }).catch(function(e){ if(window.console) console.warn('[AM worklet]',e); return false; });
    }catch(e){ return Promise.resolve(false); }
  }
  AM.preloadSynth=function(){ try{ ensureWorklet(MIC.actx()); }catch(e){} };

  /* --- violin body: discrete low modes + dense high "bridge hill" ---
     Below ~1 kHz a violin's modes are separate and audible (the A0 air
     mode, the B1 corpus modes). Above that they crowd together into a
     broad rise around 2-3 kHz that gives the instrument its carrying
     brightness. Modeling only the low modes rings like a comb filter;
     this adds the dense region as decaying filtered noise. */
  function makeBodyIR(c){
    var sr=c.sampleRate, dur=0.085, n=Math.floor(sr*dur);
    var buf=c.createBuffer(2,n,c.sampleRate);
    var modes=[[278,0.052,1.00],[432,0.044,0.82],[468,0.041,0.95],[532,0.037,0.72],
               [615,0.031,0.55],[742,0.027,0.48],[905,0.023,0.42],[1180,0.019,0.35]];
    // golden-angle phase spread: keeps the modes from all firing in step,
    // which is what made the earlier body sound like a ringing comb filter
    var ph=[]; for (var q=0;q<modes.length;q++) ph.push((q*2.399963)%(2*Math.PI));
    for (var ch=0; ch<2; ch++){
      var d=buf.getChannelData(ch);
      var det=ch? 1.012 : 1.0;
      // bandpass state for the dense region
      var z1=0,z2=0;
      var f0=2400*det, Q=1.1;
      var w=2*Math.PI*f0/sr, al=Math.sin(w)/(2*Q), cw=Math.cos(w);
      var b0=al, b1=0, b2=-al, a0=1+al, a1=-2*cw, a2=1-al;
      b0/=a0; b1/=a0; b2/=a0; a1/=a0; a2/=a0;
      var x1=0,x2=0;
      for (var i=0;i<n;i++){
        var t=i/sr, v=0;
        for (var m=0;m<modes.length;m++){
          v+=modes[m][2]*Math.exp(-t/modes[m][1])*Math.sin(2*Math.PI*modes[m][0]*det*t+ph[m]);
        }
        // dense upper region
        var noise=(Math.random()*2-1)*Math.exp(-t/0.016);
        var bpv=b0*noise+b1*x1+b2*x2-a1*z1-a2*z2;
        x2=x1; x1=noise; z2=z1; z1=bpv;
        v+=bpv*14.0;   // calibrated: bridge hill ~8 dB under the low modes
        v+=0.5*Math.exp(-t/0.0018)*(Math.random()*2-1);   // initial radiation knock
        d[i]=v/7.5;
      }
    }
    return buf;
  }
  function makeRoomIR(c){
    var sr=c.sampleRate, dur=0.85, n=Math.floor(sr*dur);
    var buf=c.createBuffer(2,n,sr);
    for (var ch=0;ch<2;ch++){
      var d=buf.getChannelData(ch);
      for (var i=0;i<n;i++){
        var t=i/sr;
        d[i]=(Math.random()*2-1)*Math.exp(-t/0.20)*(t<0.012?t/0.012:1)*0.42;
      }
    }
    return buf;
  }

  function stop(){
    if (!current) return;
    try{
      current.forEach(function(nd){
        if (nd && nd.stop) nd.stop();
        else if (nd && nd.disconnect) nd.disconnect();
      });
    }catch(e){}
    current=null;
  }

  /* --- build the shared output chain (body + voicing + room) --- */
  function outputChain(c){
    if (!bodyIR) bodyIR=makeBodyIR(c);
    if (!roomIR) roomIR=makeRoomIR(c);
    var inGain=c.createGain(); inGain.gain.value=1;

    var bodyConv=c.createConvolver(); bodyConv.buffer=bodyIR; bodyConv.normalize=true;
    var wet=c.createGain(); wet.gain.value=1.0;
    var dry=c.createGain(); dry.gain.value=0.22;
    inGain.connect(bodyConv); bodyConv.connect(wet);
    inGain.connect(dry);
    var sum=c.createGain(); wet.connect(sum); dry.connect(sum);

    // voicing: warm chest, remove the honky midrange, lift the carrying band
    var lowShelf=c.createBiquadFilter(); lowShelf.type='lowshelf';
    lowShelf.frequency.value=320; lowShelf.gain.value=2.5;
    var scoop=c.createBiquadFilter(); scoop.type='peaking';
    scoop.frequency.value=1050; scoop.gain.value=-3.5; scoop.Q.value=1.1;
    var presence=c.createBiquadFilter(); presence.type='peaking';
    presence.frequency.value=2650; presence.gain.value=4.5; presence.Q.value=0.9;
    var sizzle=c.createBiquadFilter(); sizzle.type='highshelf';
    sizzle.frequency.value=6200; sizzle.gain.value=-7;
    var rumble=c.createBiquadFilter(); rumble.type='highpass';
    rumble.frequency.value=150; rumble.Q.value=0.7;

    var comp=c.createDynamicsCompressor();
    comp.threshold.value=-19; comp.knee.value=14; comp.ratio.value=2.6;
    comp.attack.value=0.012; comp.release.value=0.25;

    var master=c.createGain(); master.gain.value=0.85;
    sum.connect(rumble); rumble.connect(lowShelf); lowShelf.connect(scoop);
    scoop.connect(presence); presence.connect(sizzle); sizzle.connect(comp);
    comp.connect(master); master.connect(c.destination);

    var room=c.createConvolver(); room.buffer=roomIR;
    var send=c.createGain(); send.gain.value=0.11;
    master.connect(send); send.connect(room); room.connect(c.destination);

    return { input:inGain, tail:[master, comp, room] };
  }

  /* --- curves derived from the sung contour --- */
  function curves(contour, octShift, n){
    var freq=new Float32Array(n), vel=new Float32Array(n);
    var maxR=1e-6;
    for (var i=0;i<n;i++) maxR=Math.max(maxR, contour.rms[i]);
    var last=220, drift=0;
    for (i=0;i<n;i++){
      var m=contour.midi[i];
      if (!isNaN(m)) last=midiToFreq(m+octShift);
      // a hair of pitch life so it never sits perfectly still
      drift=drift*0.994+(Math.random()-0.5)*0.35;
      if (drift>3.5) drift=3.5; if (drift<-3.5) drift=-3.5;
      freq[i]=last*Math.pow(2,drift/1200);
      var a=isNaN(m)?0:Math.min(1, contour.rms[i]/maxR*1.25);
      vel[i]=isNaN(m)?0:(0.045+0.235*Math.pow(a,0.7));
    }
    // ease the bow in and out of each phrase instead of switching it
    for (i=1;i<n;i++)   vel[i]=vel[i-1]+(vel[i]-vel[i-1])*0.35;
    for (i=n-2;i>=0;i--) vel[i]=vel[i+1]+(vel[i]-vel[i+1])*0.12;
    return { freq:freq, vel:vel };
  }

  function setCurve(param, arr, t0, dur, hop){
    try{ param.setValueCurveAtTime(arr, t0, dur); }
    catch(e){
      param.setValueAtTime(arr[0], t0);
      for (var k=1;k<arr.length;k+=2) param.linearRampToValueAtTime(arr[k], t0+k*hop);
    }
  }

  /* --- fallback if AudioWorklet is unavailable --- */
  function playFallback(contour, octShift, speed, onDone, c, hop, n, dur, t0, C){
    var chain=outputChain(c);
    var o1=c.createOscillator(); o1.type='sawtooth';
    var o2=c.createOscillator(); o2.type='sawtooth'; o2.detune.value=5;
    var lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=3400; lp.Q.value=0.8;
    var g=c.createGain(); g.gain.value=0.0001;
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(chain.input);
    var gains=new Float32Array(n);
    for (var i=0;i<n;i++) gains[i]=0.0001+C.vel[i]*0.85;
    o1.frequency.setValueAtTime(C.freq[0],t0); o2.frequency.setValueAtTime(C.freq[0],t0);
    setCurve(o1.frequency,C.freq,t0,dur,hop);
    setCurve(o2.frequency,C.freq,t0,dur,hop);
    setCurve(g.gain,gains,t0,dur,hop);
    o1.start(t0); o2.start(t0); o1.stop(t0+dur+0.2); o2.stop(t0+dur+0.2);
    current=[o1,o2].concat(chain.tail);
    if (onDone) setTimeout(onDone,(dur+0.25)*1000);
    return { t0:t0, dur:dur };
  }

  function playContour(contour, octShift, speed, onDone){
    stop();
    var c=MIC.actx();
    var hop=contour.hopMs/1000/speed;
    var n=contour.midi.length;
    var dur=n*hop;
    var t0=c.currentTime+0.10;
    var C=curves(contour, octShift, n);

    if (!wlReady){
      ensureWorklet(c);   // warm it for next time
      return playFallback(contour, octShift, speed, onDone, c, hop, n, dur, t0, C);
    }

    var chain=outputChain(c);
    var node;
    try{ node=new AudioWorkletNode(c,'bowed',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[1]}); }
    catch(e){ return playFallback(contour, octShift, speed, onDone, c, hop, n, dur, t0, C); }

    var pre=c.createGain(); pre.gain.value=0.55;
    node.connect(pre); pre.connect(chain.input);

    var f=node.parameters.get('frequency');
    var v=node.parameters.get('bowVelocity');
    f.setValueAtTime(C.freq[0], t0);
    v.setValueAtTime(0, t0);
    setCurve(f, C.freq, t0, dur, hop);
    setCurve(v, C.vel,  t0, dur, hop);
    // slower bowing on the half-speed pass wants a little less force
    node.parameters.get('bowForce').setValueAtTime(speed<1?3.4:2.9, t0);
    node.parameters.get('bowPos').setValueAtTime(0.105, t0);
    node.parameters.get('tone').setValueAtTime(0.79, t0);
    node.parameters.get('damping').setValueAtTime(0.9915, t0);
    v.setValueAtTime(0, t0+dur+0.02);

    current=[node, pre].concat(chain.tail);
    if (onDone) setTimeout(onDone,(dur+0.3)*1000);
    return { t0:t0, dur:dur };
  }

  /* one open string, for the tuning check */
  function playNote(freq, dur){
    stop();
    var c=MIC.actx();
    var n=Math.max(8, Math.floor(dur*1000/25));
    var contour={ midi:new Float32Array(n), rms:new Float32Array(n), hopMs:25, segs:[[0,n-1]] };
    var mid=69+12*Math.log2(freq/440);
    for (var i=0;i<n;i++){
      contour.midi[i]=mid;
      var t=i/n;
      contour.rms[i]=0.1*Math.min(1,t*6)*Math.min(1,(1-t)*5);
    }
    return playContour(contour, 0, 1, null);
  }

  return { playContour:playContour, playNote:playNote, stop:stop };
})();
AM.VSYNTH=VSYNTH;
/* ---------------- vertical 2D violin (procedural wood) ----------------
   Units: violin length = 60u (real ~60cm). Scroll top at 0u.
   nut 11u, fingerboard end 38u, bridge 43.8u, body 24u..59.5u.
   Finger y for s semitones above open: nutY + L*(1-2^(-s/12)), L=32.8u. */
var V2D=(function(){
  var cv, g, W=0, H=0, DPR=1;
  var Sc=6, CX=0, TOP=0;                 // px per unit, center x, top y
  var staticCv=null;
  var saPc=2;
  var U={ nut:11, fbEnd:38, bridge:43.8, bodyTop:24, bodyBot:59.5, total:60 };
  var state={ si:-1, semis:0, svara:'', bow:false, bowUntil:0, bowPhase:0, dotColor:'#4da3ff' };

  function ux(u){ return CX+u*Sc; }      // horizontal offset from center (units)
  function uy(u){ return TOP+u*Sc; }     // vertical from violin top

  function stringX(si, yU){
    var t=(yU-U.nut)/(U.bridge-U.nut);
    t=Math.max(-0.15, Math.min(1.2, t));
    var gapN=0.62, gapB=1.18;
    var gap=gapN+(gapB-gapN)*t;
    return CX+(si-1.5)*gap*Sc;
  }
  function semisToY(s){
    var L=U.bridge-U.nut;
    return uy(U.nut + L*(1-Math.pow(2,-s/12)));
  }

  function init(canvas){
    cv=canvas; g=cv.getContext('2d');
    size();
    window.addEventListener('resize', size);
    loop();
  }
  function size(){
    W=window.innerWidth; H=window.innerHeight;
    DPR=Math.min(window.devicePixelRatio||1,2);
    cv.width=W*DPR; cv.height=H*DPR;
    g.setTransform(DPR,0,0,DPR,0,0);
    var topPad=58, botPad=Math.min(272, H*0.36);
    var availH=Math.max(300, H-topPad-botPad);
    Sc=availH/U.total;
    CX=W/2; TOP=topPad;
    paintStatic();
  }
  function configure(pc){ saPc=pc; paintStatic(); }

  /* ---- body half-width profile (units) by length position ----
     Real proportions: body 355mm; upper bout 168 (47%), waist 108 (30%),
     lower bout 206 (58%). Control points measured off a Strad outline. */
  var PROFILE=[[0,0.5],[0.02,4.0],[0.07,6.9],[0.13,8.0],[0.18,8.35],[0.24,7.9],[0.30,6.6],
               [0.335,5.9],[0.36,5.55],[0.42,5.42],[0.47,5.40],[0.52,5.55],[0.575,5.9],
               [0.615,6.5],[0.66,8.2],[0.72,9.7],[0.78,10.3],[0.84,10.0],[0.90,8.9],[0.95,6.6],[0.985,3.6],[1,0.6]];
  function halfW(u){
    if (u<U.bodyTop||u>U.bodyBot) return 0;
    var t=(u-U.bodyTop)/(U.bodyBot-U.bodyTop);
    var P=PROFILE;
    var i=0;
    while (i<P.length-2 && P[i+1][0]<t) i++;
    var p0=P[Math.max(0,i-1)], p1=P[i], p2=P[i+1], p3=P[Math.min(P.length-1,i+2)];
    var span=p2[0]-p1[0];
    var tt=span>0 ? (t-p1[0])/span : 0;
    // Catmull-Rom
    var t2=tt*tt, t3=t2*tt;
    var w=0.5*((2*p1[1]) + (-p0[1]+p2[1])*tt + (2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2 + (-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3);
    // subtle C-bout corner points
    function bump(c,wd,h){ var d=(t-c)/wd; return h*Math.exp(-d*d); }
    w+=bump(0.335,0.012,0.30)+bump(0.615,0.012,0.34);
    return Math.max(0.2,w);
  }

  function bodyPath(ctx, inset){
    inset=inset||0;
    var steps=90;
    ctx.beginPath();
    for (var i=0;i<=steps;i++){
      var u=U.bodyTop+(U.bodyBot-U.bodyTop)*i/steps;
      var x=ux(0)+ (halfW(u)*Sc-inset);
      var y=uy(u);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    for (i=steps;i>=0;i--){
      var u2=U.bodyTop+(U.bodyBot-U.bodyTop)*i/steps;
      ctx.lineTo(ux(0)-(halfW(u2)*Sc-inset), uy(u2));
    }
    ctx.closePath();
  }

  function paintStatic(){
    staticCv=document.createElement('canvas');
    staticCv.width=W*DPR; staticCv.height=H*DPR;
    var s=staticCv.getContext('2d');
    s.setTransform(DPR,0,0,DPR,0,0);

    /* stage glow behind */
    var glow=s.createRadialGradient(CX,uy(40),Sc*4,CX,uy(40),Sc*46);
    glow.addColorStop(0,'rgba(232,180,100,0.10)'); glow.addColorStop(1,'rgba(232,180,100,0)');
    s.fillStyle=glow; s.fillRect(0,0,W,H);

    /* ---- body ---- */
    s.save();
    bodyPath(s,0);
    s.shadowColor='rgba(0,0,0,0.65)'; s.shadowBlur=26; s.shadowOffsetY=10;
    var wood=s.createLinearGradient(CX-Sc*15,uy(U.bodyTop),CX+Sc*15,uy(U.bodyBot));
    wood.addColorStop(0,'#c78a45'); wood.addColorStop(0.45,'#a9612a'); wood.addColorStop(1,'#7c4218');
    s.fillStyle=wood; s.fill();
    s.restore();

    /* grain inside body */
    s.save(); bodyPath(s,0); s.clip();
    for (var i=0;i<46;i++){
      var gx=CX+(Math.random()-0.5)*Sc*26;
      s.strokeStyle='rgba(60,28,8,'+(0.05+Math.random()*0.09)+')';
      s.lineWidth=0.8+Math.random()*1.6;
      s.beginPath();
      var y0=uy(U.bodyTop), y1=uy(U.bodyBot);
      s.moveTo(gx, y0);
      var wob=(Math.random()-0.5)*Sc*2.4;
      s.bezierCurveTo(gx+wob, y0+(y1-y0)*0.33, gx-wob, y0+(y1-y0)*0.66, gx+(Math.random()-0.5)*Sc*1.6, y1);
      s.stroke();
    }
    for (i=0;i<14;i++){
      var gx2=CX+(Math.random()-0.5)*Sc*24;
      s.strokeStyle='rgba(255,214,150,'+(0.04+Math.random()*0.05)+')';
      s.lineWidth=1+Math.random()*2;
      s.beginPath(); s.moveTo(gx2,uy(U.bodyTop)); s.lineTo(gx2+(Math.random()-0.5)*Sc*2,uy(U.bodyBot)); s.stroke();
    }
    // varnish sheen
    var sheen=s.createRadialGradient(CX-Sc*6,uy(30),Sc,CX-Sc*4,uy(34),Sc*22);
    sheen.addColorStop(0,'rgba(255,235,190,0.30)'); sheen.addColorStop(0.5,'rgba(255,230,180,0.08)'); sheen.addColorStop(1,'rgba(255,255,255,0)');
    s.fillStyle=sheen; bodyPath(s,0); s.fill();
    // edge vignette
    s.strokeStyle='rgba(30,12,2,0.55)'; s.lineWidth=5; bodyPath(s,2); s.stroke();
    s.restore();

    // purfling (double inset line)
    s.strokeStyle='rgba(24,12,4,0.9)'; s.lineWidth=1.4; bodyPath(s,7); s.stroke();
    s.strokeStyle='rgba(240,210,160,0.35)'; s.lineWidth=1; bodyPath(s,9.5); s.stroke();
    // outer rim highlight
    s.strokeStyle='rgba(255,225,170,0.5)'; s.lineWidth=1.6; bodyPath(s,0.5); s.stroke();

    /* ---- f-holes ---- */
    [-1,1].forEach(function(side){
      s.save();
      s.translate(CX+side*Sc*4.6, uy(43.4));
      s.scale(side*1,1);
      s.scale(Sc/10, Sc/10);
      s.fillStyle='#150f09';
      // upper eye
      s.beginPath(); s.arc(-2.2,-14.5,2.5,0,7); s.fill();
      // lower eye
      s.beginPath(); s.arc(2.0,13.5,3.0,0,7); s.fill();
      // stem
      s.lineWidth=3.4; s.lineCap='round'; s.strokeStyle='#150f09';
      s.beginPath();
      s.moveTo(-1.6,-12.6);
      s.bezierCurveTo(2.8,-6, -3.4,4, 1.4,11.6);
      s.stroke();
      // notches
      s.lineWidth=1.6;
      s.beginPath(); s.moveTo(-3.4,0.4); s.lineTo(-0.6,-0.4); s.stroke();
      s.beginPath(); s.moveTo(0.8,0.4); s.lineTo(3.6,-0.4); s.stroke();
      s.restore();
    });

    /* ---- neck + pegbox + scroll ---- */
    var neckG=s.createLinearGradient(CX-Sc*1.4,0,CX+Sc*1.4,0);
    neckG.addColorStop(0,'#5f3416'); neckG.addColorStop(0.5,'#8a5124'); neckG.addColorStop(1,'#4c290f');
    s.fillStyle=neckG;
    s.fillRect(CX-Sc*1.05, uy(9.6), Sc*2.1, uy(U.bodyTop+2)-uy(9.6));
    // pegbox
    s.beginPath();
    s.moveTo(CX-Sc*1.15, uy(4.6));
    s.lineTo(CX+Sc*1.15, uy(4.6));
    s.lineTo(CX+Sc*0.95, uy(11));
    s.lineTo(CX-Sc*0.95, uy(11));
    s.closePath();
    s.fillStyle='#4c290f'; s.fill();
    s.strokeStyle='rgba(0,0,0,0.4)'; s.lineWidth=1; s.stroke();
    // pegs (2 each side)
    [[5.9,-1],[7.6,1],[6.7,1],[8.6,-1]].forEach(function(p,idx){
      var py=uy(p[0]), dir=p[1];
      s.fillStyle='#241610';
      s.beginPath(); s.ellipse(CX+dir*Sc*2.1, py, Sc*0.85, Sc*0.5, 0, 0, 7); s.fill();
      s.fillStyle='#31201a';
      s.fillRect(Math.min(CX,CX+dir*Sc*1.6), py-Sc*0.16, Sc*1.6, Sc*0.32);
    });
    // scroll: spiral
    s.save();
    s.translate(CX, uy(2.4));
    s.strokeStyle='#5f3416'; s.fillStyle='#6e3d1a';
    s.beginPath(); s.arc(0,0,Sc*1.5,0,7); s.fill();
    s.lineWidth=Sc*0.32;
    s.strokeStyle='#3d2008';
    s.beginPath();
    for (var a=0;a<Math.PI*3.4;a+=0.12){
      var r=Sc*1.35*Math.exp(-a*0.22);
      var x2=Math.cos(a+2.2)*r, y2=Math.sin(a+2.2)*r;
      if (a===0) s.moveTo(x2,y2); else s.lineTo(x2,y2);
    }
    s.stroke();
    s.strokeStyle='rgba(255,220,170,0.35)'; s.lineWidth=1.2;
    s.beginPath(); s.arc(0,0,Sc*1.5,0,7); s.stroke();
    s.restore();

    /* ---- fingerboard ---- */
    var fbTopW=Sc*1.55, fbBotW=Sc*2.35;
    var fbG=s.createLinearGradient(CX-fbBotW,0,CX+fbBotW,0);
    fbG.addColorStop(0,'#0c0906'); fbG.addColorStop(0.42,'#241d15'); fbG.addColorStop(0.5,'#3a3129'); fbG.addColorStop(0.58,'#241d15'); fbG.addColorStop(1,'#0c0906');
    s.fillStyle=fbG;
    s.beginPath();
    s.moveTo(CX-fbTopW, uy(U.nut));
    s.lineTo(CX+fbTopW, uy(U.nut));
    s.lineTo(CX+fbBotW, uy(U.fbEnd-1.4));
    s.quadraticCurveTo(CX, uy(U.fbEnd+0.8), CX-fbBotW, uy(U.fbEnd-1.4));
    s.closePath();
    s.shadowColor='rgba(0,0,0,0.5)'; s.shadowBlur=8; s.shadowOffsetY=3;
    s.fill();
    s.shadowBlur=0; s.shadowOffsetY=0;
    // nut
    s.fillStyle='#e8dcc8';
    s.fillRect(CX-fbTopW, uy(U.nut)-Sc*0.28, fbTopW*2, Sc*0.34);

    /* svara position ticks on each string (sruti-aware: Sa/Pa amber) */
    var S=stringMidis(saPc);
    for (var si=0; si<4; si++){
      for (var sm=1; sm<=10; sm++){
        var y=semisToY(sm);
        if (y>uy(U.fbEnd-0.6)) continue;
        var pc=(((S[si]+sm)%12)-saPc+12)%12;
        var isSaPa=(pc===0||pc===7);
        s.fillStyle=isSaPa?'rgba(232,180,100,0.75)':'rgba(220,210,195,0.22)';
        s.beginPath(); s.arc(stringX(si,(y-TOP)/Sc), y, isSaPa?2.4:1.4, 0, 7); s.fill();
      }
    }

    /* ---- tailpiece + bridge base + chinrest + button ---- */
    // saddle + tail gut
    s.strokeStyle='#241610'; s.lineWidth=Sc*0.3;
    s.beginPath(); s.moveTo(CX,uy(56.6)); s.lineTo(CX,uy(59.2)); s.stroke();
    // tailpiece
    s.beginPath();
    s.moveTo(CX-Sc*1.0, uy(56.8));
    s.lineTo(CX+Sc*1.0, uy(56.8));
    s.lineTo(CX+Sc*1.7, uy(48.6));
    s.quadraticCurveTo(CX, uy(47.6), CX-Sc*1.7, uy(48.6));
    s.closePath();
    var tg=s.createLinearGradient(CX-Sc*1.7,0,CX+Sc*1.7,0);
    tg.addColorStop(0,'#0d0906'); tg.addColorStop(0.5,'#2c231b'); tg.addColorStop(1,'#0d0906');
    s.fillStyle=tg; s.fill();
    // fine tuners
    for (si=0; si<4; si++){
      s.fillStyle='#8f959f';
      s.beginPath(); s.arc(stringX(si,49.6), uy(49.4), Sc*0.22, 0, 7); s.fill();
    }
    // chinrest
    s.fillStyle='rgba(16,11,8,0.92)';
    s.beginPath(); s.ellipse(CX-Sc*5.2, uy(57.6), Sc*3.4, Sc*2.1, -0.35, 0, 7); s.fill();
    s.strokeStyle='rgba(255,220,170,0.12)'; s.lineWidth=1; s.stroke();

    /* bridge (drawn before strings so strings cross it) */
    var bx=Sc*2.7, by0=uy(U.bridge)-Sc*1.5, by1=uy(U.bridge)+Sc*0.35;
    var bg2=s.createLinearGradient(0,by0,0,by1);
    bg2.addColorStop(0,'#e9cfa2'); bg2.addColorStop(1,'#b98c55');
    s.fillStyle=bg2;
    s.beginPath();
    s.moveTo(CX-bx, by1);
    s.lineTo(CX-bx*0.9, by0+Sc*0.5);
    s.quadraticCurveTo(CX, by0-Sc*0.25, CX+bx*0.9, by0+Sc*0.5);
    s.lineTo(CX+bx, by1);
    s.closePath(); s.fill();
    s.strokeStyle='rgba(70,40,15,0.7)'; s.lineWidth=1; s.stroke();
    // bridge heart + cutouts
    s.fillStyle='rgba(20,12,6,0.55)';
    s.beginPath(); s.arc(CX, by0+Sc*0.75, Sc*0.32, 0, 7); s.fill();
    s.beginPath(); s.arc(CX-bx*0.62, by1-Sc*0.4, Sc*0.3, 0, 7); s.fill();
    s.beginPath(); s.arc(CX+bx*0.62, by1-Sc*0.4, Sc*0.3, 0, 7); s.fill();
  }

  /* ---- dynamic layer ---- */
  function drawStrings(){
    var names=stringNames();
    for (var si=0; si<4; si++){
      var xN=stringX(si,U.nut), xB=stringX(si,U.bridge), xT=stringX(si,49.4);
      var wdt=[2.6,2.2,1.9,1.6][si];
      var active=state.bow && state.si===si;
      // afterlength bridge->tailpiece
      g.strokeStyle='rgba(200,205,215,0.55)'; g.lineWidth=wdt*0.8;
      g.beginPath(); g.moveTo(xB,uy(U.bridge)); g.lineTo(xT,uy(49.4)); g.stroke();
      // pegbox side nut->pegs
      g.strokeStyle='rgba(200,205,215,0.4)'; g.lineWidth=wdt*0.7;
      g.beginPath(); g.moveTo(xN,uy(U.nut)); g.lineTo(CX+(si<2?-1:1)*Sc*0.5, uy(6+si*0.8)); g.stroke();
      // playing length
      if (active){
        g.strokeStyle='rgba(232,180,100,0.35)'; g.lineWidth=wdt+5;
        g.beginPath(); g.moveTo(xN,uy(U.nut)); g.lineTo(xB,uy(U.bridge)); g.stroke();
      }
      var met=g.createLinearGradient(xN-2,0,xN+2,0);
      var bright=si===0?'#d8c089':'#e3e7ee';
      met.addColorStop(0,'rgba(120,124,132,0.9)'); met.addColorStop(0.5,bright); met.addColorStop(1,'rgba(110,114,122,0.9)');
      g.strokeStyle=met; g.lineWidth=wdt;
      g.beginPath(); g.moveTo(xN,uy(U.nut)); g.lineTo(xB,uy(U.bridge)); g.stroke();
      // string label under bridge
      g.fillStyle=active?'rgba(232,180,100,0.95)':'rgba(154,163,178,0.6)';
      g.font='10.5px "JetBrains Mono", monospace'; g.textAlign='center';
      g.fillText(names[si], xB, uy(U.bridge)+Sc*1.5);
    }
  }

  function drawBow(t){
    if (!state.bow) return;
    var si=state.si;
    var bowYU=41.2;
    var y=uy(bowYU)+ (si-1.5)*Sc*0.22;
    state.bowPhase+=0.05;
    var slide=Math.sin(state.bowPhase)*Sc*3.4;
    var tilt=(si-1.5)*0.045;
    g.save();
    g.translate(CX+slide, y);
    g.rotate(tilt);
    var len=Sc*13;
    // shadow on body
    g.fillStyle='rgba(0,0,0,0.25)';
    g.fillRect(-len, Sc*0.5, len*2, Sc*0.3);
    // hair
    g.fillStyle='rgba(240,234,216,0.95)';
    g.fillRect(-len, -Sc*0.10, len*2, Sc*0.2);
    // stick (slightly above hair)
    var sg=g.createLinearGradient(0,-Sc*0.7,0,-Sc*0.3);
    sg.addColorStop(0,'#6b3a17'); sg.addColorStop(1,'#3f2109');
    g.fillStyle=sg;
    g.fillRect(-len, -Sc*0.62, len*2, Sc*0.30);
    // tip + frog
    g.fillStyle='#3f2109';
    g.beginPath(); g.moveTo(-len,-Sc*0.62); g.quadraticCurveTo(-len-Sc*0.5,-Sc*0.3,-len,-Sc*0.05); g.fill();
    g.fillStyle='#171009';
    g.fillRect(len-Sc*1.3, -Sc*0.7, Sc*1.3, Sc*1.0);
    g.fillStyle='#c9a94a';
    g.fillRect(len-Sc*1.45, -Sc*0.25, Sc*0.35, Sc*0.5);
    g.restore();
  }

  function drawFinger(){
    if (state.si<0) return;
    var y = state.semis<=0.03 ? uy(U.nut)-Sc*0.9 : semisToY(Math.min(state.semis,11));
    var x = stringX(state.si, (y-TOP)/Sc);
    var open=state.semis<=0.03;
    // glow
    var gl=g.createRadialGradient(x,y,1,x,y,Sc*1.6);
    gl.addColorStop(0,'rgba(77,163,255,0.55)'); gl.addColorStop(1,'rgba(77,163,255,0)');
    g.fillStyle=gl; g.beginPath(); g.arc(x,y,Sc*1.6,0,7); g.fill();
    if (open){
      g.strokeStyle='#46d17c'; g.lineWidth=2.4;
      g.beginPath(); g.arc(x,y,Sc*0.55,0,7); g.stroke();
    } else {
      var dg=g.createRadialGradient(x-2,y-2,1,x,y,Sc*0.55);
      dg.addColorStop(0,'#bfe0ff'); dg.addColorStop(1,'#2f7fd6');
      g.fillStyle=dg;
      g.beginPath(); g.arc(x,y,Sc*0.55,0,7); g.fill();
    }
    // svara chip
    if (state.svara){
      var tx=x+Sc*2.4, ty=y;
      g.font='700 15px "Space Grotesk", sans-serif';
      var w=g.measureText(state.svara).width+18;
      g.fillStyle='rgba(18,14,10,0.88)';
      g.strokeStyle='rgba(232,180,100,0.7)'; g.lineWidth=1.4;
      rr(g, tx, ty-13, w, 26, 8); g.fill(); g.stroke();
      g.fillStyle='#f5f1ea'; g.textAlign='left';
      g.fillText(state.svara, tx+9, ty+5.5);
    }
  }
  function rr(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  }

  function loop(){
    requestAnimationFrame(loop);
    if (!g) return;
    g.clearRect(0,0,W,H);
    if (staticCv) g.drawImage(staticCv,0,0,W,H);
    if (state.bow && performance.now()>state.bowUntil) state.bow=false;
    drawStrings();
    drawFinger();
    drawBow();
  }

  function setContinuous(si, semisF, svara){
    state.si=si; state.semis=semisF; state.svara=svara;
  }
  function bowOn(si, durMs){ state.si=si; state.bow=true; state.bowUntil=performance.now()+durMs; }
  function bowLift(){ state.bow=false; }
  function stopAll(){ state.si=-1; state.bow=false; state.svara=''; }

  return { init:init, configure:configure, setContinuous:setContinuous,
           bowOn:bowOn, bowLift:bowLift, stopAll:stopAll };
})();
AM.V2D=V2D;
/* ---------------- raga identification ----------------
   Honest about what's hard: many ragas share a scale, and what
   separates them is phrasing and gamaka, not note content. So we
   score three things — which svaras were sung (weighted by how
   long they were *held*, since nyasa reveals the skeleton),
   which svaras appear going up vs coming down (varja/vakra), and
   whether characteristic prayogas show up in the svara sequence.
   Output is a ranked guess with a confidence, never a verdict. */
var SVN=['S','R1','R2','G2','G3','M1','M2','P','D1','D2','N2','N3'];
AM.SVN=SVN;

var RAGAS=[
  /* --- melakartas / sampurna --- */
  { n:'Shankarabharanam', a:[0,2,4,5,7,9,11], d:[0,2,4,5,7,9,11], jiva:[4,11] },
  { n:'Kalyani',          a:[0,2,4,6,7,9,11], d:[0,2,4,6,7,9,11], jiva:[6,11], ph:[[6,7,9,11],[11,9,7,6]] },
  { n:'Kharaharapriya',   a:[0,2,3,5,7,9,10], d:[0,2,3,5,7,9,10], jiva:[3,10], ph:[[2,3,5,7],[10,9,7,5]] },
  { n:'Todi',             a:[0,1,3,5,7,8,10], d:[0,1,3,5,7,8,10], jiva:[3,8] },
  { n:'Mayamalavagowla',  a:[0,1,4,5,7,8,11], d:[0,1,4,5,7,8,11], jiva:[1,8] },
  { n:'Harikambhoji',     a:[0,2,4,5,7,9,10], d:[0,2,4,5,7,9,10], jiva:[4,10] },
  { n:'Natabhairavi',     a:[0,2,3,5,7,8,10], d:[0,2,3,5,7,8,10], jiva:[8,3] },
  { n:'Charukesi',        a:[0,2,4,5,7,8,10], d:[0,2,4,5,7,8,10], jiva:[8,10] },
  { n:'Vachaspati',       a:[0,2,4,6,7,9,10], d:[0,2,4,6,7,9,10], jiva:[6,10] },
  { n:'Keeravani',        a:[0,2,3,5,7,8,11], d:[0,2,3,5,7,8,11], jiva:[8,11] },
  { n:'Simhendramadhyamam',a:[0,2,3,6,7,8,11],d:[0,2,3,6,7,8,11], jiva:[6,8] },
  { n:'Shanmukhapriya',   a:[0,2,3,6,7,8,10], d:[0,2,3,6,7,8,10], jiva:[6,8] },
  { n:'Hemavati',         a:[0,2,3,6,7,9,10], d:[0,2,3,6,7,9,10], jiva:[6,3] },
  { n:'Latangi',          a:[0,2,4,6,7,8,11], d:[0,2,4,6,7,8,11], jiva:[6,8] },

  /* --- pentatonic / audava janyas --- */
  { n:'Mohanam',      a:[0,2,4,7,9],  d:[0,2,4,7,9],  jiva:[4,9], ph:[[4,7,9,7],[9,7,4,2],[2,4,7]] },
  { n:'Hamsadhwani',  a:[0,2,4,7,11], d:[0,2,4,7,11], jiva:[4,11], ph:[[2,4,7,11],[11,7,4,2]] },
  { n:'Madhyamavati', a:[0,2,5,7,10], d:[0,2,5,7,10], jiva:[5,10], ph:[[2,5,7],[10,7,5,2]] },
  { n:'Hindolam',     a:[0,3,5,8,10], d:[0,3,5,8,10], jiva:[3,8], ph:[[3,5,8],[10,8,5,3]] },
  { n:'Shuddha Saveri',a:[0,2,5,7,9], d:[0,2,5,7,9],  jiva:[5,9], ph:[[2,5,7,9]] },
  { n:'Revati',       a:[0,1,5,7,10], d:[0,1,5,7,10], jiva:[1,10] },
  { n:'Amritavarshini',a:[0,4,6,7,11],d:[0,4,6,7,11], jiva:[6,11], ph:[[4,6,7,11]] },
  { n:'Valaji',       a:[0,4,7,9,10], d:[0,4,7,9,10], jiva:[9,10] },
  { n:'Shivaranjani', a:[0,2,3,7,9],  d:[0,2,3,7,9],  jiva:[3,9] },

  /* --- janyas where direction matters --- */
  { n:'Abheri',   a:[0,3,5,7,10],       d:[0,2,3,5,7,9,10], jiva:[3,10],
    ph:[[3,5,7],[10,7,5,3],[3,2,0],[7,10,12]], note:'G M P N up, full scale down' },
  { n:'Karnataka Devagandhari', a:[0,3,5,7,10], d:[0,2,3,5,7,8,10], jiva:[3,10],
    note:'like Abheri but D1 in descent' },
  { n:'Kambhoji', a:[0,2,4,5,7,9],      d:[0,2,4,5,7,9,10], jiva:[9,4],
    ph:[[9,7,5,4],[4,5,7,9]], note:'N2 only in descent' },
  { n:'Bilahari', a:[0,2,4,7,9],        d:[0,2,4,5,7,9,11], jiva:[4,11],
    ph:[[2,4,7,9],[11,9,7,5,4]], note:'skips M and N going up' },
  { n:'Sriranjani',a:[0,2,3,5,9,10],    d:[0,2,3,5,9,10],   jiva:[3,9],
    note:'no Pa at all' },
  { n:'Kapi',     a:[0,2,5,7,10],       d:[0,2,3,4,5,7,9,10], jiva:[3,10],
    note:'pentatonic up, chromatic shades down' },
  { n:'Anandabhairavi',a:[0,2,3,5,7,8,10], d:[0,2,3,5,7,8,10], jiva:[3,8],
    ph:[[3,5,3,2]], note:'heavy gamaka on G and N' },
  { n:'Reetigowla',a:[0,2,3,5,7,9,10],  d:[0,2,3,5,7,9,10], jiva:[3,5],
    ph:[[5,3,2,3],[9,10,9,7]], note:'vakra, winding phrases' },
  { n:'Bhairavi', a:[0,2,3,5,7,9,10],   d:[0,2,3,5,7,8,10], jiva:[3,8],
    ph:[[8,7,5,3]], note:'D2 up, D1 down' },
  { n:'Saveri',   a:[0,1,5,7,8],        d:[0,1,4,5,7,8,11], jiva:[1,8] },
  { n:'Arabhi',   a:[0,2,5,7,9],        d:[0,2,4,5,7,9,11], jiva:[5,9] },
  { n:'Nalinakanti',a:[0,2,4,5,7,11],   d:[0,2,4,5,7,11],   jiva:[4,11] },
  { n:'Hamsanandi',a:[0,1,4,6,9,11],    d:[0,1,4,6,9,11],   jiva:[6,11] },
  { n:'Ranjani',  a:[0,2,3,6,9,11],     d:[0,2,3,6,9,11],   jiva:[6,9] },
  { n:'Sindhubhairavi',a:[0,1,2,3,5,7,8,10], d:[0,1,2,3,5,7,8,10], jiva:[3,8],
    note:'takes almost every shade' }
];
AM.RAGAS=RAGAS;

var RAGA=(function(){

  /* ---- skeleton track ----
     Carnatic svaras live inside gamakas, so the raw pitch is not the
     svara — the CENTRE of the oscillation is. Smooth over a window a
     little longer than a typical kampita cycle to recover that centre,
     then judge steadiness on the smoothed track. Held svaras (nyasa)
     come out steady even when heavily oscillated; only real travel
     between svaras registers as movement. */
  function skeleton(contour){
    var n=contour.midi.length, hop=contour.hopMs/1000;
    var W=Math.max(2, Math.round(0.11/hop));
    var sm=new Float32Array(n), slope=new Float32Array(n);
    for (var i=0;i<n;i++){
      var s=0,c=0;
      for (var j=i-W;j<=i+W;j++){
        if (j<0||j>=n) continue;
        var m=contour.midi[j];
        if (isNaN(m)) continue;
        s+=m; c++;
      }
      sm[i]= c? s/c : NaN;
      if (!c) sm[i]=NaN;
    }
    for (i=0;i<n;i++){
      var a=sm[Math.max(0,i-2)], b=sm[Math.min(n-1,i+2)];
      slope[i]=(isNaN(a)||isNaN(b))?99:Math.abs(b-a)/(Math.min(n-1,i+2)-Math.max(0,i-2))/hop;
    }
    return { sm:sm, slope:slope, hop:hop };
  }

  /* ---- weighted svara histogram ---- */
  function histogram(contour, saPc){
    var K=skeleton(contour);
    var n=contour.midi.length, hop=K.hop;
    var bins=new Float64Array(12);
    var maxR=1e-6;
    for (var i=0;i<n;i++) maxR=Math.max(maxR, contour.rms[i]);
    var total=0;
    function add(val, w, sig){
      var rel=((val-saPc)%12+12)%12;
      for (var k=0;k<12;k++){
        var d=Math.abs(rel-k); if (d>6) d=12-d;
        if (d<1.3) bins[k]+= w*Math.exp(-(d*d)/(2*sig*sig));
      }
    }
    for (i=0;i<n;i++){
      var m=contour.midi[i], c=K.sm[i];
      if (isNaN(m)||isNaN(c)) continue;
      var steady=1/(1+Math.pow(K.slope[i]/7.0,2));
      var amp=Math.pow(contour.rms[i]/maxR,0.6);
      var w=hop*amp*(0.25+0.75*steady);
      add(c, w, 0.30);            // the svara centre carries the weight
      add(m, w*0.10, 0.28);       // the swing gets a small say
      total+=w;
    }
    if (total<=0) return null;
    var sum=0; for (var k2=0;k2<12;k2++) sum+=bins[k2];
    if (sum<=0) return null;
    for (k2=0;k2<12;k2++) bins[k2]/=sum;
    return { bins:bins, seconds:total };
  }

  /* ---- svara sequence from steady plateaus of the skeleton ---- */
  function sequence(contour, saPc){
    var K=skeleton(contour);
    var n=contour.midi.length, hop=K.hop;
    var minF=Math.max(2, Math.round(0.09/hop));
    var seq=[], run=null;
    function flush(){
      if (!run || run.vals.length<minF) { run=null; return; }
      var v=run.vals.slice().sort(function(a,b){return a-b;});
      var med=v[v.length>>1];
      var rel=((med-saPc)%12+12)%12;
      var k=Math.round(rel)%12;
      if (Math.abs(rel-Math.round(rel))<=0.42){
        if (!seq.length || seq[seq.length-1].k!==k) seq.push({ k:k, abs:med });
      }
      run=null;
    }
    for (var i=0;i<n;i++){
      var c=K.sm[i];
      if (isNaN(c) || K.slope[i]>7.5){ flush(); continue; }
      var rel2=((c-saPc)%12+12)%12;
      var k2=Math.round(rel2)%12;
      if (run && run.k===k2) run.vals.push(c);
      else { flush(); run={ k:k2, vals:[c] }; }
    }
    flush();
    var up={}, down={};
    for (i=1;i<seq.length;i++){
      var prev=seq[i-1], cur=seq[i];
      if (cur.abs>prev.abs+0.3) up[cur.k]=(up[cur.k]||0)+1;
      else if (cur.abs<prev.abs-0.3) down[cur.k]=(down[cur.k]||0)+1;
    }
    return { seq:seq.map(function(x){return x.k;}), up:up, down:down, n:seq.length };
  }

  function hasNgram(seq, pat){
    var L=pat.length;
    for (var i=0;i+L<=seq.length;i++){
      var ok=true;
      for (var j=0;j<L;j++){ if (seq[i+j]!==(pat[j]%12)){ ok=false; break; } }
      if (ok) return true;
    }
    return false;
  }

  /* ---- expected distribution for a raga ---- */
  function expected(r){
    var E=new Float64Array(12), any=false;
    var full={};
    r.a.forEach(function(k){ full[k%12]=1; });
    r.d.forEach(function(k){ full[k%12]=1; });
    for (var k in full){
      k=+k;
      var w=1;
      if (k===0||k===7) w=1.35;                                  // Sa/Pa anchors
      if (r.jiva && r.jiva.indexOf(k)>=0) w*=1.6;                // jiva svaras
      E[k]=w; any=true;
    }
    if (!any) return null;
    var s=0; for (var i=0;i<12;i++) s+=E[i];
    for (i=0;i<12;i++) E[i]/=s;
    return { E:E, full:full };
  }

  function scoreRaga(r, H, S){
    var ex=expected(r), E=ex.E, full=ex.full;
    var aSet={}; r.a.forEach(function(k){ aSet[k%12]=1; });
    var dSet={}; r.d.forEach(function(k){ dSet[k%12]=1; });

    /* 1. shape match (Bhattacharyya). Rewards ragas whose svara set is
          neither missing what was sung nor padded with notes that weren't. */
    var bc=0, foreign=0;
    for (var k=0;k<12;k++){
      bc+=Math.sqrt(H.bins[k]*E[k]);
      if (!full[k]) foreign+=H.bins[k];
    }
    var s = bc - foreign*1.6;

    /* 1b. svaras the raga claims but the singer never touched. A raga
           shouldn't win by owning notes that were never sung — the longer
           the phrase, the more we expect its full set to show up. */
    var missing=0;
    for (k=0;k<12;k++){ if (full[k] && H.bins[k]<0.03) missing+=E[k]; }
    s -= 1.15*missing*Math.min(1, H.seconds/3.0);

    /* 2. direction: varja svaras sung in the forbidden direction */
    var dirPen=0, upN=0, downN=0, aroClean=true, avaClean=true;
    for (k in S.up){ k=+k; upN+=S.up[k];
      if (!aSet[k]){ dirPen+=Math.min(2,S.up[k]); aroClean=false; } }
    for (k in S.down){ k=+k; downN+=S.down[k];
      if (!dSet[k]){ dirPen+=Math.min(2,S.down[k]); avaClean=false; } }
    s -= 0.075*dirPen;

    /* 3. explaining a restrictive arohana/avarohana is real evidence:
          singing S G M P N up is *why* we say Abheri and not Kharaharapriya */
    var nFull=Object.keys(full).length;
    var restA=(nFull-Object.keys(aSet).length)/nFull;
    var restD=(nFull-Object.keys(dSet).length)/nFull;
    if (aroClean && upN>=2)   s += 0.55*restA*Math.min(1,upN/3);
    if (avaClean && downN>=2) s += 0.55*restD*Math.min(1,downN/3);

    /* 4. characteristic prayogas */
    var phHits=0;
    if (r.ph) r.ph.forEach(function(p){ if (hasNgram(S.seq,p)) phHits++; });
    s += 0.10*Math.min(2,phHits);

    return { score:s, foreign:foreign, phHits:phHits, bc:bc };
  }

  function analyze(contour, saPc){
    var H=histogram(contour, saPc);
    if (!H) return null;
    var S=sequence(contour, saPc);
    var results=RAGAS.map(function(r){
      var sc=scoreRaga(r,H,S);
      return { raga:r, score:sc.score, foreign:sc.foreign, phHits:sc.phHits };
    });
    results.sort(function(a,b){ return b.score-a.score; });

    var top=results[0], T=0.055;
    var sum=0;
    results.forEach(function(r){ r._e=Math.exp((r.score-top.score)/T); sum+=r._e; });
    var p=top._e/sum;
    var heardFactor=Math.min(1, H.seconds/2.4);
    var distinct=0; for (var k=0;k<12;k++) if (H.bins[k]>0.05) distinct++;
    var noteFactor=Math.min(1, distinct/4);
    var conf=p*(0.42+0.36*heardFactor+0.22*noteFactor);
    /* absolute fit gate: how much of what was sung falls outside the raga at
       all. Real raga singing lands near 0.06; wandering chromatic input runs
       0.13+. Without this, a confident-looking winner can emerge from noise. */
    var fit=1-(top.foreign-0.06)/0.14;
    conf*=Math.max(0.12, Math.min(1, fit));

    var heard=[];
    for (k=0;k<12;k++) if (H.bins[k]>0.05) heard.push(k);

    var ambiguous=null;
    if (results[1]){
      var setOf=function(r){ var o={}; r.a.concat(r.d).forEach(function(x){o[x%12]=1;}); return Object.keys(o).map(Number).sort(function(a,b){return a-b;}).join(','); };
      if (setOf(top.raga)===setOf(results[1].raga)) ambiguous=results[1].raga.n;
    }

    return {
      top:top.raga, conf:Math.max(0.05,Math.min(0.97,conf)),
      alts:results.slice(1,4).map(function(r){ return { n:r.raga.n, p:r._e/sum }; }),
      heard:heard.map(function(k){ return SVN[k]; }),
      seconds:H.seconds, distinct:distinct, ambiguous:ambiguous,
      note:top.raga.note||'', phHits:top.phHits,
      seq:S.seq.map(function(k){ return SVN[k]; })
    };
  }

  return { analyze:analyze, histogram:histogram, sequence:sequence, skeleton:skeleton };
})();
AM.RAGA=RAGA;
/* ---------------- app state & flow ---------------- */
var state={
  phase:'home',            // home | idle | listening | playing
  frames:[], contour:null, strings:null, raga:null,
  saPc:2, octShift:0, hop:25,
  playInfo:null, playSpeed:1
};

function setLive(txt, isViolin){
  var el=$('live-sv');
  el.innerHTML=txt;
  el.classList.toggle('violin', !!isViolin);
}

/* ---------------- raga card ---------------- */
function renderRaga(r){
  var q=$('rg-q'), bar=$('rg-bar').firstChild, conf=$('rg-conf'),
      heard=$('rg-heard'), alts=$('rg-alts');
  $('raga-card').classList.remove('thinking');
  if (!r){
    q.textContent='Sing a phrase and I\u2019ll guess the raga';
    bar.style.width='0%'; conf.textContent='\u2013';
    heard.textContent=''; alts.textContent='';
    return;
  }
  var pct=Math.round(r.conf*100);
  if (r.conf>=0.62)      q.innerHTML='That sounds like <span class="nm">'+r.top.n+'</span>.';
  else if (r.conf>=0.36) q.innerHTML='Are you singing <span class="nm">'+r.top.n+'</span>?';
  else                   q.innerHTML='Maybe <span class="nm">'+r.top.n+'</span> \u2014 but I\u2019m guessing.';
  bar.style.width=pct+'%';
  var qual = r.conf>=0.62?'fairly confident' : (r.conf>=0.36?'a reasonable guess':'low confidence');
  conf.textContent=pct+'% \u00b7 '+qual+' \u00b7 '+r.seconds.toFixed(1)+'s of material';
  var h='heard <b>'+r.heard.join(' ')+'</b>';
  if (r.note) h+=' \u00b7 '+r.note;
  if (r.phHits) h+=' \u00b7 caught '+r.phHits+' characteristic phrase'+(r.phHits>1?'s':'');
  if (r.seconds<2) h+=' \u00b7 sing longer for a better read';
  heard.innerHTML=h;
  var a='';
  if (r.ambiguous) a='same scale as <span>'+r.ambiguous+'</span> \u2014 phrasing is what separates them. ';
  if (r.alts.length) a+='or maybe: '+r.alts.map(function(x){
    return '<span>'+x.n+'</span> '+Math.round(x.p*100)+'%'; }).join(' \u00b7 ');
  alts.innerHTML=a;
}
function analyzeRaga(){
  if (!state.contour){ state.raga=null; renderRaga(null); return; }
  $('raga-card').classList.add('thinking');
  setTimeout(function(){
    state.raga=RAGA.analyze(state.contour, state.saPc);
    renderRaga(state.raga);
  }, 30);
}

/* ---------------- record ---------------- */
function startListening(){
  if (state.phase==='listening'){ finishListening(); return; }
  VSYNTH.stop(); V2D.stopAll(); state.playInfo=null;
  state.frames=[]; state.contour=null; state.raga=null;
  renderRaga(null);
  $('btn-rec').classList.add('listening');
  $('hud-h').textContent='Listening\u2026';
  $('hud-sub').textContent='sing your phrase with full gamakas \u00b7 go quiet (or tap) to finish';
  $('btn-play').disabled=true; $('btn-slow').disabled=true;
  state.phase='listening';
  state._silence=0; state._voiced=false;
  MIC.start(onFrame, state.hop).catch(function(err){
    state.phase='idle';
    $('btn-rec').classList.remove('listening');
    $('hud-h').textContent='Microphone blocked';
    $('hud-sub').textContent='allow mic access in your browser\u2019s site settings and try again';
    toast('Couldn\u2019t open the microphone');
    if (window.console) console.warn('[AM mic]', err);
  });
}

function onFrame(p){
  if (state.phase!=='listening') return;
  state.frames.push({ f:p.freq, rms:p.rms });
  if (p.freq>0){
    state._voiced=true; state._silence=0;
    var mf=freqToMidiFloat(p.freq);
    setLive(svaraOf(mf, state.saPc)+' <small>'+p.freq.toFixed(0)+' Hz</small>', false);
    // mirror your voice on the violin as you sing
    var S=stringMidis(state.saPc);
    var mm=mf+state.octShift, si=0;
    for (var q=3;q>=0;q--){ if (mm>=S[q]-0.3){ si=q; break; } }
    V2D.setContinuous(si, Math.max(0, mm-S[si]), svaraOf(mf, state.saPc));
    V2D.bowOn(si, 160);
  } else {
    state._silence+=state.hop;
    if (state._silence>420){ setLive('\u2013', false); V2D.bowLift(); }
  }
  var durMs=state.frames.length*state.hop;
  if ((state._voiced && state._silence>1800) || durMs>14000) finishListening();
  else if (!state._voiced && durMs>15000) finishListening();
}

function finishListening(){
  if (state.phase!=='listening') return;
  MIC.stop();
  $('btn-rec').classList.remove('listening');
  state.phase='idle';
  V2D.stopAll();
  var contour=processContour(state.frames, state.hop);
  if (!contour){
    $('hud-h').textContent='Didn\u2019t catch that';
    $('hud-sub').textContent='sing a little louder and closer to the mic \u2014 tap to try again';
    setLive('\u2013');
    return;
  }
  state.contour=contour;
  state.strings=chooseStrings(contour, state.octShift, state.saPc);
  var secs=(contour.midi.length*state.hop/1000).toFixed(1);
  $('hud-h').textContent='Got it \u2014 '+secs+'s phrase';
  $('hud-sub').textContent='now the violin answers';
  $('btn-play').disabled=false; $('btn-slow').disabled=false;
  analyzeRaga();
  setTimeout(function(){ play(1); }, 550);
}

/* ---------------- playback ---------------- */
function play(speed){
  if (!state.contour || state.phase==='listening') return;
  VSYNTH.stop();
  state.phase='playing'; state.playSpeed=speed;
  $('hud-h').textContent = speed<1 ? 'Half speed \u2014 same pitch' : 'The violin answers';
  $('hud-sub').textContent='watch the finger ride your gamakas';
  var info=VSYNTH.playContour(state.contour, state.octShift, speed, function(){
    if (state.phase==='playing'){
      state.phase='idle';
      V2D.stopAll();
      $('hud-h').textContent='Again?';
      $('hud-sub').textContent='replay \u00b7 half speed \u00b7 or sing the next phrase';
      setLive('\u2013');
    }
  });
  state.playInfo={ t0:performance.now()+(info.t0-MIC.actx().currentTime)*1000, dur:info.dur*1000 };
}

/* visual sync loop */
function syncLoop(){
  requestAnimationFrame(syncLoop);
  if (state.phase!=='playing' || !state.playInfo || !state.contour) return;
  var el=(performance.now()-state.playInfo.t0)/state.playInfo.dur;
  if (el<0) el=0;
  if (el>1) return;
  var c=state.contour, n=c.midi.length;
  var i=Math.min(n-1, Math.floor(el*n));
  var m=c.midi[i];
  if (isNaN(m)){ V2D.bowLift(); return; }
  var si=state.strings[i];
  var semis=(m+state.octShift)-stringMidis(state.saPc)[si];
  var sv=svaraOf(m, state.saPc);
  V2D.setContinuous(si, Math.max(0,semis), sv);
  V2D.bowOn(si, 150);
  setLive(sv+' <small>'+midiToFreq(m+state.octShift).toFixed(0)+' Hz</small>', true);
}

/* ---------------- boot ---------------- */
function boot(){
  try{
    AM.bootStage='css'; injectCSS();
    AM.bootStage='dom'; buildDOM();
    AM.bootStage='violin'; V2D.init($('vcv')); V2D.configure(state.saPc);
    AM.bootStage='wire';
    $('btn-start').addEventListener('click', function(){
      $('scr-home').classList.add('hidden');
      ['top-hud','live','raga-card','controls'].forEach(function(id){ $(id).classList.remove('hidden'); });
      renderRaga(null);
      startListening();
    });
    $('btn-rec').addEventListener('click', startListening);
    $('btn-play').addEventListener('click', function(){ play(1); });
    $('btn-slow').addEventListener('click', function(){ play(0.5); });
    $('btn-clear').addEventListener('click', function(){
      VSYNTH.stop(); V2D.stopAll();
      if (state.phase==='listening') finishListening();
      state.contour=null; state.frames=[]; state.raga=null;
      renderRaga(null);
      $('btn-play').disabled=true; $('btn-slow').disabled=true;
      $('hud-h').textContent='Sing your phrase';
      $('hud-sub').textContent='tap the mic when ready';
      setLive('\u2013');
    });
    $('sel-sruti').addEventListener('change', function(e){
      state.saPc=parseInt(e.target.value,10);
      V2D.configure(state.saPc);
      if (DRONE.isOn()) DRONE.on(state.saPc);
      if (state.contour){
        state.strings=chooseStrings(state.contour, state.octShift, state.saPc);
        analyzeRaga();
      }
      toast('Sruti: Sa = '+NOTE_NAMES[state.saPc]+' \u00b7 strings: Sa\u0323 Pa\u0323 Sa Pa');
    });
    $('sel-oct').addEventListener('change', function(e){
      state.octShift=parseInt(e.target.value,10);
      if (state.contour) state.strings=chooseStrings(state.contour, state.octShift, state.saPc);
    });
    $('btn-drone').addEventListener('click', function(){
      if (DRONE.isOn()){ DRONE.off(); this.classList.remove('on'); }
      else { DRONE.on(state.saPc); this.classList.add('on'); }
    });
    syncLoop();
    if (AM.preloadSynth) AM.preloadSynth();
    AM.bootStage='ready'; AM.ready=true;
    var ld=$('am-loading'); if (ld) ld.remove();
  }catch(e){
    AM.bootError=e;
    var ld=$('am-loading');
    if (ld) ld.innerHTML='<div style="text-align:center;max-width:420px;font-family:system-ui;color:#f5f1ea;padding:20px">'+
      '<div style="font-size:34px">\uD83C\uDFBB</div><h2 style="margin:10px 0">Couldn\u2019t start</h2>'+
      '<p style="color:#a89f92;font-size:14px">Error at stage "'+AM.bootStage+'": '+(e&&e.message?e.message:e)+'</p>'+
      '<p style="margin-top:14px"><a href="index.html" style="color:#e8b464">\u2190 Back to portfolio</a></p></div>';
    if (window.console) console.error('[AM boot]', AM.bootStage, e);
  }
}
if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
