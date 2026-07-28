
'use strict';
/* EARLY FAILSAFE: reveal the menu even if something below throws at load time.
   Runs before any Three.js object is constructed, so a missing/blocked CDN
   can never trap the user on the loading spinner. */
(function earlyReveal(){
  function reveal(){
    try {
      var l = document.getElementById('loading');
      var sel = document.getElementById('select');
      if (sel && !document.querySelector('.screen.active#game, .screen.active#select')){
        if (l) l.classList.remove('active');
        sel.classList.add('active');
      }
    } catch(e){}
  }
  // fire a few times; the main boot() will normally beat these, which is fine
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(reveal, 1800); });
  else setTimeout(reveal, 1800);
  setTimeout(reveal, 3000);
})();
/* ============================================================
   Tennis Point Simulator — Seshasayi Rangaraj
   Modules: Config · Audio · Renderer · Voice Parser ·
            Game Engine · Animation · Analytics · UI
   ============================================================ */

/* =========================== CONFIG =========================== */
const COURT = {
  L: 23.77, W_SINGLES: 8.23, W_DOUBLES: 10.97,
  halfL: 11.885, halfWs: 4.115, halfWd: 5.485, service: 6.4, netH: 0.95
};

const SURFACES = {
  clay: {
    key:'clay', slam:'Roland Garros', label:'Clay', pill:'#b3502e',
    court:0xb85c36, surround:0x8f4326, line:0xf5ece2, glow:0xffd9c0,
    bounce:1.18, speed:0.86,
    lightColor:0xffd9a8, lightIntensity:1.05, ambient:0x6b4a3a, sky:0x2a1712,
    mods:{ drop:1.18, passing:1.12, lob:1.05, topspin:1.08, slice:0.93, flat:0.97, winner:0.92, net:0.9, safe:1.04 }
  },
  grass: {
    key:'grass', slam:'Wimbledon', label:'Grass', pill:'#2e8b45',
    court:0x3f8f4a, surround:0x2f6e3a, line:0xffffff, glow:0xd8ffe0,
    bounce:0.72, speed:1.16,
    lightColor:0xfff6e0, lightIntensity:1.25, ambient:0x51704e, sky:0x14231a,
    mods:{ drop:1.02, passing:0.94, lob:0.95, topspin:0.94, slice:1.14, flat:1.05, winner:1.06, net:1.15, safe:0.97 }
  },
  hard: {
    key:'hard', slam:'US Open', label:'Hard Court', pill:'#2565b0',
    court:0x2f6fb5, surround:0x3f8f63, line:0xffffff, glow:0xcfe6ff,
    bounce:1.0, speed:1.0,
    lightColor:0xe8f0ff, lightIntensity:1.15, ambient:0x3c4a5c, sky:0x0d1420,
    mods:{ drop:1.0, passing:1.0, lob:1.0, topspin:1.0, slice:1.0, flat:1.0, winner:1.0, net:1.0, safe:1.0 }
  }
};

/* Scenarios. Coordinates: user half z>0, opponent half z<0.
   x: + is user's right (deuce side visually right of screen). */
const SCENARIOS = [
  { id:1, tier:1, tierName:'Serve Return',
    title:'First Serve Down the T',
    desc:'Deuce court. A heavy first serve fires down the middle. Get it back — and get it back with purpose.',
    userStart:{x:1.6,z:12.6}, oppStart:{x:-0.4,z:-12.4},
    incoming:{from:{x:-0.35,z:-11.9}, land:{x:0.35,z:5.9}, apex:2.6, serve:true, pace:1.25},
    ctx:{serveReturn:true, wide:false, stretched:false},
    maxShots:8,
    optimal:{ seq:'Block return deep middle → CC deep → work the backhand', avg:79,
      note:'Against a T serve you have no angle — the percentage play is a deep, central block that resets the point. Angles come later.' } },
  { id:2, tier:1, tierName:'Serve Return',
    title:'Wide Serve, Ad Court',
    desc:'A slider drags you off the court to your backhand side. The down-the-line reply looks tempting. It usually loses.',
    userStart:{x:-2.6,z:12.4}, oppStart:{x:0.6,z:-12.4},
    incoming:{from:{x:0.7,z:-11.9}, land:{x:-3.85,z:5.4}, apex:2.4, serve:true, pace:1.2},
    ctx:{serveReturn:true, wide:true, stretched:true},
    maxShots:8,
    optimal:{ seq:'CC return deep → recover to center → CC deep again', avg:76,
      note:'Stretched wide, crosscourt is hit over the low part of the net into the longest diagonal. Down the line from here is a ~35% shot.' } },
  { id:3, tier:2, tierName:'Rally Construction',
    title:'Neutral Ball, Build the Point',
    desc:'A rally ball lands center-baseline. Nothing is on. Your job: create something from nothing without donating an error.',
    userStart:{x:0,z:12.2}, oppStart:{x:0,z:-12.2},
    incoming:{from:{x:-0.5,z:-10.5}, land:{x:0.2,z:10.3}, apex:3.1, pace:0.95},
    ctx:{},
    maxShots:8,
    optimal:{ seq:'CC deep → CC deep → inside-out FH → open court', avg:78,
      note:'Percentage tennis: stretch the crosscourt diagonal until a short ball comes, then run around and hit inside-out.' } },
  { id:4, tier:2, tierName:'Rally Construction',
    title:'Short Ball — Green Light',
    desc:'The opponent floats one short to mid-court. This is the ball you built for. Step in and take it — but pick the right target.',
    userStart:{x:0.8,z:7.6}, oppStart:{x:-0.8,z:-11.8},
    incoming:{from:{x:-0.9,z:-10.8}, land:{x:0.8,z:5.4}, apex:2.7, pace:0.75},
    ctx:{shortBall:true, attacking:true},
    maxShots:6,
    optimal:{ seq:'Inside-out FH deep → close the net → volley the open court', avg:72,
      note:'From inside the baseline, the inside-out forehand carries ~75% with real hurt. The drop shot here is fine too — you\'re close enough.' } },
  { id:5, tier:2, tierName:'Rally Construction',
    title:'Dragged Wide — Survive',
    desc:'A heavy crosscourt has pulled you off the singles line on your forehand side. You\'re stretched. Defence is a skill.',
    userStart:{x:3.9,z:12.3}, oppStart:{x:-1.2,z:-11.9},
    incoming:{from:{x:-1.4,z:-10.6}, land:{x:3.95,z:10.6}, apex:2.9, pace:1.1},
    ctx:{stretched:true, defensive:true},
    maxShots:8,
    optimal:{ seq:'High CC deep (buy time) → recover → reset to neutral', avg:74,
      note:'The highlight-reel DTL from full stretch is a ~45% shot that loses you the point on average. Height + depth crosscourt resets it.' } },
  { id:6, tier:3, tierName:'Tactical Puzzle',
    title:'Opponent at the Net',
    desc:'They\'ve approached behind a deep ball and they\'re crowding the net. Two doors: pass them, or go over them.',
    userStart:{x:-1.2,z:12.1}, oppStart:{x:0.6,z:-3.2},
    incoming:{from:{x:0.4,z:-6.2}, land:{x:-1.3,z:9.8}, apex:2.2, pace:1.05},
    ctx:{oppAtNet:true},
    maxShots:6,
    optimal:{ seq:'Lob over the backhand side → retake the baseline', avg:61,
      note:'Nothing is high-percentage here — that\'s the puzzle. The lob edges the pass on most surfaces, and even a decent pass needs dipping topspin.' } },
  { id:7, tier:3, tierName:'Tactical Puzzle',
    title:'Cat and Mouse',
    desc:'A patient opponent who misses nothing. Winners from neutral will not land. Construct a 4+ shot pattern, then strike.',
    userStart:{x:0,z:12.2}, oppStart:{x:0,z:-12.2},
    incoming:{from:{x:0.6,z:-10.4}, land:{x:-0.4,z:10.4}, apex:3.2, pace:0.9},
    ctx:{construction:true},
    maxShots:9,
    optimal:{ seq:'CC deep → CC deep → short angle CC → DTL behind them', avg:75,
      note:'Early winners are taxed here. Move them side to side until the court opens, then change direction late.' } },
  { id:8, tier:3, tierName:'Tactical Puzzle',
    title:'Match Point Down',
    desc:'Championship point against you. Your hand is shaking, the crowd is silent. Do you play the odds — or play the hero?',
    userStart:{x:-0.6,z:12.4}, oppStart:{x:0.4,z:-12.2},
    incoming:{from:{x:0.6,z:-11.9}, land:{x:-2.6,z:6.0}, apex:2.5, serve:true, pace:1.15},
    ctx:{serveReturn:true, matchPoint:true, stretched:false},
    maxShots:8,
    optimal:{ seq:'Deep CC return → make them play → first safe opening, take it', avg:73,
      note:'On break points the pros\' shot quality goes UP, not down — they choose higher-percentage patterns under pressure, not lower.' } }
];

/* =========================== AUDIO =========================== */
const AudioFX = (() => {
  let ctx = null, master = null, crowdGain = null, enabled = true;
  function ensure(){
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
      // crowd murmur: looped filtered noise
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i=0;i<len;i++) d[i] = (Math.random()*2-1) * 0.5;
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=420; bp.Q.value=0.5;
      crowdGain = ctx.createGain(); crowdGain.gain.value = 0.0;
      src.connect(bp); bp.connect(crowdGain); crowdGain.connect(master); src.start();
      return true;
    } catch(e){ return false; }
  }
  function env(node, t0, a, peak, rel){
    node.gain.setValueAtTime(0.0001, t0);
    node.gain.exponentialRampToValueAtTime(peak, t0+a);
    node.gain.exponentialRampToValueAtTime(0.0001, t0+a+rel);
  }
  function blip(freq, type, peak, rel, a=0.008, detuneTo=null){
    if (!enabled || !ensure() || ctx.state==='suspended' && ctx.resume()) {}
    if (!enabled || !ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (detuneTo) o.frequency.exponentialRampToValueAtTime(detuneTo, t+rel);
    env(g, t, a, peak, rel);
    o.connect(g); g.connect(master); o.start(t); o.stop(t+a+rel+0.05);
  }
  function noiseHit(peak, rel, freq){
    if (!enabled || !ensure()) return;
    const t = ctx.currentTime;
    const len = ctx.sampleRate * (rel+0.05);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i=0;i<len;i++) d[i] = (Math.random()*2-1);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=freq; f.Q.value=1.1;
    const g = ctx.createGain(); env(g, t, 0.004, peak, rel);
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  return {
    resume(){ if (ensure() && ctx.state==='suspended') ctx.resume(); },
    setEnabled(v){ enabled = v; if (crowdGain) crowdGain.gain.value = v?0.012:0; },
    get enabled(){ return enabled; },
    hit(power=0.5, kind='fh'){ // pop, deeper when harder
      const base = kind==='volley'? 340 : kind==='bh'? 230 : 260;
      blip(base - power*90, 'triangle', 0.5+power*0.3, 0.09);
      noiseHit(0.25+power*0.2, 0.05, 900+power*400);
    },
    bounce(surface){
      const f = surface==='hard'? 190 : surface==='grass'? 240 : 150;
      noiseHit(surface==='clay'?0.16:0.22, surface==='hard'?0.045:0.06, f);
    },
    netCord(){ blip(520,'sawtooth',0.28,0.18,0.004,180); noiseHit(0.2,0.08,600); },
    out(){ blip(196,'square',0.22,0.22); },
    winner(){ blip(523,'triangle',0.4,0.28); setTimeout(()=>blip(784,'triangle',0.45,0.4),120); crowdSwell(0.09,1.6); },
    lossSting(){ blip(311,'triangle',0.3,0.3); setTimeout(()=>blip(233,'triangle',0.3,0.5),140); },
    ui(){ blip(880,'sine',0.12,0.05); },
    whoosh(){ noiseHit(0.12,0.22,1400); },
    micOn(){ blip(660,'sine',0.2,0.08); setTimeout(()=>blip(880,'sine',0.2,0.1),90); },
    micOff(){ blip(880,'sine',0.15,0.06); setTimeout(()=>blip(660,'sine',0.15,0.09),80); },
    parsed(){ blip(740,'sine',0.18,0.09); },
    rally(len){ if (crowdGain && enabled) crowdGain.gain.setTargetAtTime(Math.min(0.012+len*0.004,0.035), ctx.currentTime, 0.6); },
    crowdBase(){ if (crowdGain && enabled) crowdGain.gain.setTargetAtTime(0.012, ctx.currentTime, 1.2); }
  };
  function crowdSwell(to, dur){
    if (!crowdGain || !enabled) return;
    const t = ctx.currentTime;
    crowdGain.gain.cancelScheduledValues(t);
    crowdGain.gain.setTargetAtTime(to, t, 0.08);
    crowdGain.gain.setTargetAtTime(0.012, t+dur*0.4, dur*0.5);
  }
})();

/* =========================== VOICE PARSER =========================== */
const Parser = (() => {
  const dir = [
    ['down the line','downTheLine'],['down-the-line','downTheLine'],['dtl','downTheLine'],['up the line','downTheLine'],['the line','downTheLine'],[' line','downTheLine'],
    ['cross court','crosscourt'],['crosscourt','crosscourt'],['cross-court','crosscourt'],['cross','crosscourt'],['diagonal','crosscourt'],['angle','crosscourt'],
    ['inside out','insideOut'],['inside-out','insideOut'],['inside in','insideIn'],['inside-in','insideIn'],
    ['middle','middle'],['center','middle'],['centre','middle'],['body','middle'],['at him','middle'],['at her','middle'],['at them','middle']
  ];
  const depth = [
    ['drop shot','dropShot'],['dropshot','dropShot'],['drop','dropShot'],['dropper','dropShot'],
    ['deep','deep'],['baseline','deep'],['heavy and deep','deep'],
    ['short angle','short'],['short','short'],
    ['mid court','mid'],['midcourt','mid'],['mid','mid']
  ];
  const spin = [
    ['topspin','topspin'],['top spin','topspin'],['heavy','topspin'],['loopy','topspin'],['loop','topspin'],['spin','topspin'],
    ['slice','slice'],['chip','slice'],['underspin','slice'],['backspin','slice'],['chop','slice'],
    ['flat','flat'],['hard','flat'],['drive','flat'],['punch','flat']
  ];
  const intents = [
    ['go for it',0.5],['go for the winner',0.5],['winner',0.5],['finish',0.5],['put it away',0.5],['kill it',0.5],
    ['rip it',0.4],['rip',0.4],['crush',0.4],['smack',0.4],['blast',0.4],
    ['aggressive',0.3],['attack',0.3],['big',0.3],
    ['touch',-0.1],['feel',-0.1],['soft',-0.1],['gentle',-0.1],
    ['safe',0],['steady',0],['neutral',0],['consistent',0],['reset',0],['high percentage',0],['percentage',0]
  ];
  const misc = { lob:['lob','over them','over him','over her','moonball','moon ball'],
                 pass:['pass','passing shot'],
                 forehand:['forehand','fh'], backhand:['backhand','bh'],
                 serveVolley:['serve and volley','approach','come in','come to the net','net'] };

  function find(text, table){
    for (const [k,v] of table) if (text.includes(k)) return v;
    return null;
  }
  function parse(raw){
    const text = ' ' + raw.toLowerCase().replace(/[^a-z\s-]/g,'') + ' ';
    const shot = { raw: raw.trim(), direction:null, depth:null, spin:null, intent:0, intentSet:false, special:null, approach:false, recognized:false };
    if (misc.lob.some(k=>text.includes(k))) shot.special='lob';
    if (misc.pass.some(k=>text.includes(k))) shot.special = shot.special||'pass';
    if (misc.serveVolley.some(k=>text.includes(k)) && !text.includes('over the net')) shot.approach = true;
    shot.direction = find(text, dir);
    shot.depth = find(text, depth);
    shot.spin = find(text, spin);
    for (const [k,v] of intents){ if (text.includes(k)) { shot.intent = v; shot.intentSet = true; break; } }
    if (shot.depth === 'dropShot') shot.special = 'drop';
    shot.recognized = !!(shot.direction || shot.depth || shot.spin || shot.special || shot.intentSet);
    // defaults
    if (!shot.direction) shot.direction = 'crosscourt';
    if (!shot.depth) shot.depth = shot.special==='drop' ? 'dropShot' : (shot.special==='lob' ? 'deep' : 'deep');
    if (!shot.spin) shot.spin = shot.special==='drop' ? 'slice' : (shot.special==='lob' ? 'topspin' : 'topspin');
    if (shot.special==='drop') shot.depth='dropShot';
    return shot;
  }
  const dirLabel = {crosscourt:'Crosscourt', downTheLine:'Down the line', middle:'Middle', insideOut:'Inside-out', insideIn:'Inside-in'};
  const depthLabel = {deep:'Deep', mid:'Mid-court', short:'Short', dropShot:'Drop shot'};
  const spinLabel = {topspin:'Topspin', slice:'Slice', flat:'Flat'};
  function describe(shot){
    if (shot.special==='lob') return `Lob · ${dirLabel[shot.direction]}`;
    if (shot.special==='drop') return `Drop shot · ${dirLabel[shot.direction]}`;
    return `${spinLabel[shot.spin]} · ${dirLabel[shot.direction]} · ${depthLabel[shot.depth]}`;
  }
  function pillsFor(shot){
    const p = [];
    if (shot.special==='lob') p.push(['depth','Lob']);
    else if (shot.special==='drop') p.push(['depth','Drop shot']);
    else { p.push(['spin', spinLabel[shot.spin]]); p.push(['depth', depthLabel[shot.depth]]); }
    p.push(['dir', dirLabel[shot.direction]]);
    if (shot.intent>=0.4) p.push(['intent','🔥 Go for it']);
    else if (shot.intent>=0.25) p.push(['intent','Aggressive']);
    else if (shot.intent<0) p.push(['intent','Touch']);
    if (shot.approach) p.push(['intent','+ Net approach']);
    return p;
  }
  return { parse, describe, pillsFor, dirLabel };
})();

/* =========================== 3D RENDERER =========================== */
const R = {
  renderer:null, scene:null, camera:null, clock:null,
  courtGroup:null, netGroup:null, netMesh:null,
  user:null, opp:null, ball:null, ballShadow:null, targetRing:null,
  trail:[], particles:[], heatDots:[], replayLines:[],
  camState:{ pos:null, look:null, tPos:null, tLook:null, speed:2.2, shake:0 },
  timeScale:1, isMobile:false, surface:null, running:false
};

const CAMS = {
  broadcast:{ pos:[0,8.6,20.6], look:[0,0.6,-2.5] },
  broadcastMobile:{ pos:[0,9.6,23.5], look:[0,0.4,-1.5] },
  overhead:{ pos:[0.01,27,2], look:[0,0,0] },
  side:{ pos:[16,2.4,1.5], look:[0,1,0] },
  intro:{ pos:[0,16,30], look:[0,0,0] }
};

function initRenderer(){
  if (R.renderer) return true;
  if (typeof THREE === 'undefined'){ bootError('3D library failed to load. Check your connection and refresh.'); return false; }
  R.isMobile = window.innerWidth < 768;
  try {
    R.renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  } catch(err){ bootError('WebGL is unavailable in this browser. Try Chrome, Edge, or Safari with hardware acceleration on.'); return false; }
  R.renderer.setPixelRatio(Math.min(window.devicePixelRatio, R.isMobile?1.5:2));
  R.renderer.setSize(window.innerWidth, window.innerHeight);
  R.renderer.shadowMap.enabled = true;
  R.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('stage').appendChild(R.renderer.domElement);
  R.scene = new THREE.Scene();
  R.camera = new THREE.PerspectiveCamera(52, window.innerWidth/window.innerHeight, 0.1, 200);
  R.clock = new THREE.Clock();
  R.camState.pos = new THREE.Vector3(0,8.6,20.6);
  R.camState.look = new THREE.Vector3(0,0.6,-2.5);
  window.addEventListener('resize', onResize);
  onResize();
  animateLoop();
  return true;
}
function bootError(msg){
  const l = document.getElementById('loading');
  if (l){ l.classList.add('active'); l.innerHTML = '<p style="max-width:340px;text-align:center;line-height:1.6;letter-spacing:.02em;text-transform:none;font-size:14px">'+msg+'</p>'; }
}
function onResize(){
  if (!R.renderer) return;
  R.isMobile = window.innerWidth < 768;
  R.renderer.setSize(window.innerWidth, window.innerHeight);
  R.camera.aspect = window.innerWidth/window.innerHeight;
  R.camera.fov = R.isMobile ? (window.innerHeight>window.innerWidth ? 68 : 56) : 52;
  R.camera.updateProjectionMatrix();
  const hint = document.getElementById('rotateHint');
  if (hint) hint.style.display = (R.isMobile && window.innerHeight>window.innerWidth && document.getElementById('game').classList.contains('active')) ? 'block' : 'none';
}

function makeLine(w, l, color, y=0.012){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), new THREE.MeshBasicMaterial({ color }));
  m.rotation.x = -Math.PI/2; m.position.y = y;
  return m;
}

function buildCourt(surfKey){
  const S = SURFACES[surfKey]; R.surface = S;
  if (R.courtGroup) R.scene.remove(R.courtGroup);
  if (R.netGroup) R.scene.remove(R.netGroup);
  // clear old lights
  R.scene.children.slice().forEach(c=>{ if (c.isLight) R.scene.remove(c); });
  R.scene.background = new THREE.Color(S.sky);
  R.scene.fog = new THREE.Fog(S.sky, 40, 90);

  const g = new THREE.Group();
  // outer apron
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(36, 52), new THREE.MeshLambertMaterial({ color:S.surround }));
  apron.rotation.x = -Math.PI/2; apron.position.y = -0.01; apron.receiveShadow = true;
  g.add(apron);
  // playing surface
  const play = new THREE.Mesh(new THREE.PlaneGeometry(COURT.W_DOUBLES+4.2, COURT.L+8), new THREE.MeshLambertMaterial({ color:S.court }));
  play.rotation.x = -Math.PI/2; play.position.y = 0; play.receiveShadow = true;
  g.add(play);
  // grass mow stripes
  if (surfKey==='grass'){
    for (let i=-3;i<=3;i+=2){
      const s = new THREE.Mesh(new THREE.PlaneGeometry(1.9, COURT.L+8), new THREE.MeshLambertMaterial({ color:0x46a153, transparent:true, opacity:0.5 }));
      s.rotation.x = -Math.PI/2; s.position.set(i*1.9, 0.004, 0);
      g.add(s);
    }
  }
  // lines
  const LW = 0.07, C = S.line;
  const addL = m => g.add(m);
  // baselines
  [[0, COURT.halfL],[0,-COURT.halfL]].forEach(([x,z])=>{ const l = makeLine(COURT.W_DOUBLES+LW, LW, C); l.position.set(x,0.012,z); addL(l); });
  // doubles sidelines
  [COURT.halfWd,-COURT.halfWd].forEach(x=>{ const l = makeLine(LW, COURT.L, C); l.position.set(x,0.012,0); addL(l); });
  // singles sidelines — glow
  [COURT.halfWs,-COURT.halfWs].forEach(x=>{
    const l = makeLine(LW, COURT.L, C); l.position.set(x,0.013,0); addL(l);
    const gl = makeLine(0.24, COURT.L, S.glow, 0.006); gl.material.transparent = true; gl.material.opacity = 0.10; gl.position.x = x; addL(gl);
  });
  // service lines
  [COURT.service,-COURT.service].forEach(z=>{ const l = makeLine(COURT.halfWs*2, LW, C); l.position.set(0,0.012,z); addL(l); });
  // center service line + marks
  const cs = makeLine(LW, COURT.service*2, C); cs.position.set(0,0.012,0); addL(cs);
  [COURT.halfL,-COURT.halfL].forEach(z=>{ const l = makeLine(LW,0.3,C); l.position.set(0,0.013,z>0?z-0.15:z+0.15); addL(l); });
  R.courtGroup = g; R.scene.add(g);

  // net
  const ng = new THREE.Group();
  const netGeo = new THREE.PlaneGeometry(11.6, COURT.netH, 24, 6);
  const pos = netGeo.attributes.position;
  for (let i=0;i<pos.count;i++){
    const x = pos.getX(i), y = pos.getY(i);
    pos.setY(i, y - (1-Math.pow(Math.abs(x)/5.8,2))*0.07*( (y+COURT.netH/2)/COURT.netH ));
  }
  netGeo.computeVertexNormals();
  R.netMesh = new THREE.Mesh(netGeo, new THREE.MeshBasicMaterial({ color:0xdddddd, transparent:true, opacity:0.30, side:THREE.DoubleSide, wireframe:true }));
  R.netMesh.position.y = COURT.netH/2;
  ng.add(R.netMesh);
  const band = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.06, 0.03), new THREE.MeshLambertMaterial({ color:0xffffff }));
  band.position.y = COURT.netH-0.02; ng.add(band);
  [5.9,-5.9].forEach(x=>{ const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,1.12,10), new THREE.MeshLambertMaterial({ color:0x222228 })); p.position.set(x,0.56,0); p.castShadow = true; ng.add(p); });
  R.netGroup = ng; R.scene.add(ng);

  // ambience ring glow (fake stadium)
  const ringGeo = new THREE.RingGeometry(19, 30, 48);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color:S.glow, transparent:true, opacity:0.05, side:THREE.DoubleSide }));
  ring.rotation.x = -Math.PI/2; ring.position.y = 0.02;
  g.add(ring);

  // lights
  const hemi = new THREE.HemisphereLight(S.lightColor, 0x0a0a0f, 0.5);
  R.scene.add(hemi);
  const amb = new THREE.AmbientLight(S.ambient, 0.7);
  R.scene.add(amb);
  const sun = new THREE.DirectionalLight(S.lightColor, S.lightIntensity);
  sun.position.set(surfKey==='clay'? -14 : 10, surfKey==='grass'? 24 : 16, surfKey==='clay'? 8 : 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(R.isMobile?1024:2048, R.isMobile?1024:2048);
  sun.shadow.camera.left=-18; sun.shadow.camera.right=18; sun.shadow.camera.top=20; sun.shadow.camera.bottom=-20; sun.shadow.camera.far=70;
  R.scene.add(sun);
  const rim = new THREE.DirectionalLight(0x88aaff, 0.35); rim.position.set(0,6,-24); R.scene.add(rim);
}

/* ---- Players: low-poly humanoids ---- */
function makePlayer(main, accentColor){
  const mat = c => new THREE.MeshLambertMaterial({ color:c });
  const gp = new THREE.Group();
  const skin = 0xd9a679;
  // legs
  const legGeo = new THREE.CylinderGeometry(0.075,0.09,0.72,8);
  const legL = new THREE.Mesh(legGeo, mat(0xf0f0f2)); legL.position.set(-0.12,0.36,0);
  const legR = legL.clone(); legR.position.x = 0.12;
  // torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.21,0.62,10), mat(main));
  torso.position.y = 1.02;
  // head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15,12,10), mat(skin));
  head.position.y = 1.52;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.155,12,8,0,Math.PI*2,0,Math.PI/2.4), mat(accentColor));
  cap.position.y = 1.55;
  // arms (pivots at shoulder)
  function arm(side){
    const pivot = new THREE.Group(); pivot.position.set(0.24*side, 1.3, 0);
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.05,0.56,8), mat(skin));
    a.position.y = -0.28; pivot.add(a);
    return {pivot, mesh:a};
  }
  const armR = arm(1), armL = arm(-1);
  // racquet on right arm
  const rq = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.3,6), mat(0x222));
  handle.position.y=-0.15; rq.add(handle);
  const headR = new THREE.Mesh(new THREE.TorusGeometry(0.14,0.02,6,14), mat(accentColor));
  headR.position.y=-0.42; rq.add(headR);
  const strings = new THREE.Mesh(new THREE.CircleGeometry(0.13,12), new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.28, side:THREE.DoubleSide}));
  strings.position.y=-0.42; rq.add(strings);
  rq.position.y=-0.5; armR.pivot.add(rq);
  armR.pivot.rotation.z = -0.35; armL.pivot.rotation.z = 0.35;
  [legL,legR,torso,head,cap].forEach(m=>{m.castShadow=true;});
  gp.add(legL,legR,torso,head,cap,armR.pivot,armL.pivot);
  gp.userData = { armR:armR.pivot, armL:armL.pivot, torso, head, t:Math.random()*7,
                  moveFrom:null, moveTo:null, moveT:1, moveDur:0.5, swing:0, swingDir:1, lean:0 };
  return gp;
}
function placePlayer(p, x, z){ p.position.set(x, 0, z); p.userData.moveT = 1; }
function movePlayer(p, x, z, dur){
  p.userData.moveFrom = p.position.clone();
  p.userData.moveTo = new THREE.Vector3(x,0,z);
  p.userData.moveT = 0; p.userData.moveDur = Math.max(dur, 0.18);
}
function swingPlayer(p, kind){ // kind: fh (forehand), bh, serve, volley, lunge, fail
  p.userData.swing = 0.0001;
  p.userData.swingKind = kind;
  AudioFX.hit(kind==='serve'?0.9:0.55, kind);
}
function updatePlayers(dt){
  [R.user, R.opp].forEach(p=>{
    if (!p) return;
    const u = p.userData;
    u.t += dt;
    // idle sway
    const sway = Math.sin(u.t*2.2)*0.035;
    u.torso.rotation.z = sway; u.head.position.x = sway*0.6;
    p.position.y = Math.abs(Math.sin(u.t*2.2))*0.02;
    // movement
    if (u.moveT < 1 && u.moveTo){
      u.moveT = Math.min(1, u.moveT + dt/u.moveDur);
      const e = 1-Math.pow(1-u.moveT,3);
      p.position.lerpVectors(u.moveFrom, u.moveTo, e);
      const dir = u.moveTo.clone().sub(u.moveFrom);
      u.torso.rotation.x = 0.16*(1-u.moveT);
      if (dir.length()>0.4) u.torso.rotation.z = THREE.MathUtils.clamp(-dir.x*0.06,-0.22,0.22);
    } else { u.torso.rotation.x *= 0.9; }
    // swing
    if (u.swing > 0){
      u.swing += dt*5.2;
      const k = u.swingKind, s = Math.sin(Math.min(u.swing,1)*Math.PI);
      if (k==='serve'){ u.armR.rotation.x = -2.6*s; }
      else if (k==='bh'){ u.armL.rotation.x = -1.5*s; u.armR.rotation.x = -1.2*s; u.torso.rotation.y = 0.7*s; }
      else if (k==='volley'){ u.armR.rotation.x = -1.0*s; }
      else if (k==='fist'){ u.armR.rotation.x = -2.2*s; }
      else if (k==='drop'){ u.head.rotation.x = 0.5*s; u.torso.rotation.x = 0.28*s; }
      else { u.armR.rotation.x = -1.7*s; u.torso.rotation.y = -0.6*s; }
      if (u.swing >= 1){ u.swing = 0; u.armR.rotation.x=0; u.armL.rotation.x=0; u.torso.rotation.y=0; u.head.rotation.x=0; }
    }
    // pressure lean
    u.torso.rotation.x += u.lean*0.15;
  });
}

/* ---- Ball, trail, particles ---- */
function buildBall(){
  if (R.ball) R.scene.remove(R.ball);
  R.ball = new THREE.Mesh(new THREE.SphereGeometry(0.11,14,12),
    new THREE.MeshLambertMaterial({ color:0xd7e948, emissive:0x3a4208 }));
  R.ball.castShadow = true;
  const seam = new THREE.Mesh(new THREE.TorusGeometry(0.11,0.008,6,20), new THREE.MeshBasicMaterial({color:0xf5fbe0}));
  seam.rotation.x = 0.9; R.ball.add(seam);
  R.scene.add(R.ball);
  R.ballShadow = new THREE.Mesh(new THREE.CircleGeometry(0.14,16), new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.35 }));
  R.ballShadow.rotation.x = -Math.PI/2; R.ballShadow.position.y = 0.015;
  R.scene.add(R.ballShadow);
  // trail pool
  R.trail.forEach(t=>R.scene.remove(t.m));
  R.trail = [];
  for (let i=0;i<26;i++){
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.055,6,6), new THREE.MeshBasicMaterial({ color:0x4da3ff, transparent:true, opacity:0 }));
    R.scene.add(m); R.trail.push({m, life:0});
  }
  R.trailIdx = 0;
  // target ring
  if (R.targetRing) R.scene.remove(R.targetRing);
  const tg = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55,0.75,32), new THREE.MeshBasicMaterial({ color:0x39d98a, transparent:true, opacity:0.75, side:THREE.DoubleSide }));
  ring.rotation.x = -Math.PI/2;
  const fill = new THREE.Mesh(new THREE.CircleGeometry(0.55,32), new THREE.MeshBasicMaterial({ color:0x39d98a, transparent:true, opacity:0.16, side:THREE.DoubleSide }));
  fill.rotation.x = -Math.PI/2; fill.position.y = -0.002;
  tg.add(ring, fill); tg.position.y = 0.02; tg.visible = false;
  tg.userData = {ring, fill};
  R.targetRing = tg; R.scene.add(tg);
}
function dropTrail(color){
  const t = R.trail[R.trailIdx % R.trail.length]; R.trailIdx++;
  t.m.position.copy(R.ball.position);
  t.m.material.color.setHex(color);
  t.m.material.opacity = 0.55; t.life = 1;
}
function spawnParticles(pos, color, n, spread, up){
  for (let i=0;i<n;i++){
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.045,5,5), new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.9 }));
    m.position.copy(pos);
    R.scene.add(m);
    R.particles.push({ m, life:1,
      vel:new THREE.Vector3((Math.random()-0.5)*spread, Math.random()*up+0.5, (Math.random()-0.5)*spread) });
  }
}
function addHeatDot(x,z,color){
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.22,12), new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.4 }));
  m.rotation.x = -Math.PI/2; m.position.set(x,0.008,z);
  R.scene.add(m); R.heatDots.push(m);
  if (R.heatDots.length>14){ const old = R.heatDots.shift(); R.scene.remove(old); }
}
function clearHeatDots(){ R.heatDots.forEach(m=>R.scene.remove(m)); R.heatDots = []; }
function clearReplayLines(){ R.replayLines.forEach(l=>R.scene.remove(l)); R.replayLines = []; }
function drawArcLine(from, to, apex, color){
  const pts = [];
  for (let i=0;i<=24;i++){
    const t = i/24;
    pts.push(new THREE.Vector3(
      THREE.MathUtils.lerp(from.x,to.x,t),
      arcY(from.y||1, 0.05, apex, t),
      THREE.MathUtils.lerp(from.z,to.z,t)));
  }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color, transparent:true, opacity:0.85 }));
  R.scene.add(line); R.replayLines.push(line);
  return line;
}
function arcY(y0, y1, apex, t){
  // quadratic passing y0 at t=0, apex-ish mid, y1 at t=1
  const lin = y0 + (y1-y0)*t;
  return lin + Math.sin(t*Math.PI) * Math.max(apex - Math.max(y0,y1)*0.5, 0.2);
}

/* ---- Camera ---- */
function camTo(name, speed=2.2){
  const c = (name==='broadcast' && R.isMobile) ? CAMS.broadcastMobile : CAMS[name];
  R.camState.tPos = new THREE.Vector3(...c.pos);
  R.camState.tLook = new THREE.Vector3(...c.look);
  R.camState.speed = speed;
}
function camShake(amount){ R.camState.shake = Math.max(R.camState.shake, amount); }

/* ---- Flights (ball animation) ---- */
const flights = [];
function flyBall(opts){
  // {from:{x,y,z}, to:{x,z}, apex, dur, color, spin, onDone, bounce:boolean, netHit:boolean}
  flights.length = 0;
  R.ball.visible = true;
  flights.push(Object.assign({ t:0, y0:opts.from.y!=null?opts.from.y:1.0, y1:opts.toY!=null?opts.toY:0.11 }, opts));
}
function updateFlights(dt){
  if (!flights.length) return;
  const f = flights[0];
  f.t += dt / f.dur;
  const t = Math.min(f.t, 1);
  const x = THREE.MathUtils.lerp(f.from.x, f.to.x, t);
  const z = THREE.MathUtils.lerp(f.from.z, f.to.z, t);
  let y = arcY(f.y0, f.y1, f.apex, t);
  R.ball.position.set(x, y, z);
  R.ball.rotation.x += dt * (f.spin==='topspin'? 22 : f.spin==='slice'? -12 : 14);
  R.ballShadow.position.set(x, 0.015, z);
  const sc = 1 + Math.min(y,4)*0.28;
  R.ballShadow.scale.set(sc,sc,1);
  R.ballShadow.material.opacity = Math.max(0.08, 0.4 - y*0.06);
  dropTrail(f.color || 0x4da3ff);
  if (t >= 1){
    flights.shift();
    const done = f.onDone; if (done) done();
  }
}
function ballSquash(){
  R.ball.scale.set(1.15,0.7,1.15);
  setTimeout(()=>{ if (R.ball) R.ball.scale.set(1,1,1); }, 90);
}

/* ---- Loop ---- */
function animateLoop(){
  requestAnimationFrame(animateLoop);
  if (!R.renderer) return;
  const rawDt = Math.min(R.clock.getDelta(), 0.05);
  const dt = rawDt * R.timeScale;
  // camera
  const cs = R.camState;
  if (cs.tPos){
    cs.pos.lerp(cs.tPos, Math.min(1, rawDt*cs.speed));
    cs.look.lerp(cs.tLook, Math.min(1, rawDt*cs.speed));
  }
  if (Replay.active) Replay.orbit(rawDt);
  let px = cs.pos.x, py = cs.pos.y, pz = cs.pos.z;
  if (cs.shake > 0.001){
    px += (Math.random()-0.5)*cs.shake; py += (Math.random()-0.5)*cs.shake*0.6; pz += (Math.random()-0.5)*cs.shake;
    cs.shake *= Math.pow(0.02, rawDt);
  }
  R.camera.position.set(px,py,pz);
  R.camera.lookAt(cs.look);
  if (R.running){
    updatePlayers(dt);
    updateFlights(dt);
    // trail fade
    R.trail.forEach(tr=>{ if (tr.life>0){ tr.life -= rawDt*2.2; tr.m.material.opacity = Math.max(0, tr.life)*0.55; } });
    // particles
    for (let i=R.particles.length-1;i>=0;i--){
      const p = R.particles[i];
      p.life -= rawDt*1.6;
      p.vel.y -= rawDt*7;
      p.m.position.addScaledVector(p.vel, rawDt);
      p.m.material.opacity = Math.max(0,p.life)*0.9;
      if (p.life<=0){ R.scene.remove(p.m); R.particles.splice(i,1); }
    }
    // target ring pulse
    if (R.targetRing && R.targetRing.visible){
      const s = 1 + Math.sin(performance.now()/280)*0.07;
      R.targetRing.scale.set(s,1,s);
    }
    UI.tickLabels();
  }
  R.renderer.render(R.scene, R.camera);
}

/* ---- Surface preview mini-scenes ---- */
function initPreviews(){
  ['clay','grass','hard'].forEach(key=>{
    const canvas = document.getElementById('prev-'+key);
    if (!canvas) return;
    let rr;
    try { rr = new THREE.WebGLRenderer({ canvas, antialias:true }); }
    catch(err){ canvas.style.display='none'; return; }
    const scene = new THREE.Scene();
    const S = SURFACES[key];
    scene.background = new THREE.Color(S.sky);
    const cam = new THREE.PerspectiveCamera(45, 1.6, 0.1, 100);
    const grp = new THREE.Group();
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(13,26), new THREE.MeshLambertMaterial({ color:S.court }));
    plane.rotation.x = -Math.PI/2; grp.add(plane);
    const addLn = (w,l,x,z)=>{ const m = makeLine(w,l,S.line,0.02); m.position.set(x,0.02,z); grp.add(m); };
    addLn(11,0.12,0,11.885); addLn(11,0.12,0,-11.885);
    addLn(0.12,23.77,4.115,0); addLn(0.12,23.77,-4.115,0); addLn(0.12,23.77,5.485,0); addLn(0.12,23.77,-5.485,0);
    addLn(8.2,0.12,0,6.4); addLn(8.2,0.12,0,-6.4); addLn(0.12,12.8,0,0);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(11.6,0.95), new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.3, side:THREE.DoubleSide }));
    net.position.y = 0.48; grp.add(net);
    scene.add(grp);
    scene.add(new THREE.AmbientLight(S.ambient, 0.9));
    const dl = new THREE.DirectionalLight(S.lightColor, 1.1); dl.position.set(6,12,6); scene.add(dl);
    let a = Math.random()*6.28;
    function frame(){
      if (!document.getElementById('select').classList.contains('active')) { requestAnimationFrame(frame); return; }
      a += 0.0035;
      cam.position.set(Math.sin(a)*17, 12, Math.cos(a)*17);
      cam.lookAt(0,0,0);
      const w = canvas.clientWidth||280, h = canvas.clientHeight||170;
      if (canvas.width !== w) { rr.setSize(w,h,false); cam.aspect = w/h; cam.updateProjectionMatrix(); }
      rr.render(scene, cam);
      requestAnimationFrame(frame);
    }
    frame();
  });
}

/* =========================== GAME ENGINE =========================== */
const Engine = (() => {
  function surfMods(){ return R.surface.mods; }
  function originDepth(z){ return z>12.45?'behind' : z>8.6?'baseline' : z>4.8?'mid' : 'net'; }

  function computeProbability(shot, state){
    const M = surfMods(), scn = state.scenario, ctx = scn.ctx;
    const od = originDepth(state.userPos.z);
    let p, tag;
    const oppAtNet = state.oppAtNet;

    if (oppAtNet){
      if (shot.special==='lob'){ p = 58*M.lob; tag='lob vs net player'; }
      else if (shot.special==='drop'){ p = 15; tag='drop vs net player'; }
      else {
        p = (shot.direction==='downTheLine'?46 : shot.direction==='middle'?41 : 50);
        p *= M.passing;
        if (shot.spin==='topspin') p += 4;
        if (shot.spin==='slice') p -= 5;
        tag='passing shot';
      }
    }
    else if (state.isReturn){
      const wide = ctx.wide;
      if (shot.special==='drop'){ p = 19; tag='drop off a serve'; }
      else if (shot.special==='lob'){ p = 55; tag='lob return'; }
      else if (wide){
        p = (shot.direction==='crosscourt'?80 : shot.direction==='middle'?70 : shot.direction==='downTheLine'?37 : 60);
        tag='return, stretched wide';
      } else {
        p = (shot.direction==='middle'?82 : shot.direction==='crosscourt'?76 : shot.direction==='downTheLine'?62 : 66);
        tag='return off the T serve';
      }
      p *= (M[shot.spin]||1);
    }
    else if (shot.special==='drop'){
      p = (od==='behind'?28 : od==='baseline'?34 : 66) * M.drop;
      tag = od==='mid'||od==='net' ? 'drop from inside' : 'drop from the baseline';
    }
    else if (shot.special==='lob'){
      p = 70*M.lob; tag='defensive lob';
    }
    else if (shot.intent>=0.4){
      p = (od==='mid'||od==='net'?63 : od==='baseline'?41 : 27) * M.winner;
      if (shot.direction==='downTheLine') p -= 4;
      if (shot.direction==='crosscourt') p += 3;
      tag='going for the winner';
    }
    else {
      const deepTable = { crosscourt:87, middle:88, downTheLine:70, insideOut:75, insideIn:66 };
      const midTable  = { crosscourt:89, middle:90, downTheLine:74, insideOut:79, insideIn:70 };
      const shortTable= { crosscourt:68, middle:60, downTheLine:55, insideOut:64, insideIn:58 };
      const base = shot.depth==='mid'? midTable : shot.depth==='short'? shortTable : deepTable;
      p = base[shot.direction] || 75;
      p *= (M[shot.spin]||1);
      if (od==='mid'||od==='net') p += 3;
      tag='rally ball';
    }

    if (state.stretched && !state.isReturn){
      p *= (shot.direction==='downTheLine') ? 0.72 : 0.9;
      tag += ', from full stretch';
    }
    if (shot.intent>0) p *= (1 - shot.intent*0.35);
    if (shot.intent<0) p *= 1.03;
    if (shot.approach) p *= M.net;
    if (ctx.construction && shot.intent>=0.4 && state.shotNum<4){ p *= 0.62; tag='winner attempt, too early'; }
    if (ctx.matchPoint && shot.intent>0) p *= 0.94;
    return { p: Math.round(THREE.MathUtils.clamp(p, 8, 94)), tag };
  }

  function computePressure(shot, state){
    let pr;
    if (shot.special==='drop') pr = 0.85;
    else if (shot.special==='lob') pr = state.oppAtNet ? 0.7 : 0.2;
    else if (shot.depth==='short') pr = 0.55;
    else if (shot.depth==='mid') pr = 0.26;
    else pr = (shot.direction==='middle') ? 0.42 : 0.72;
    pr += Math.max(shot.intent,0)*0.28;
    if (shot.intent>=0.4) pr += 0.12;
    if (state.stretched) pr -= 0.12;
    return THREE.MathUtils.clamp(pr, 0, 1);
  }

  function rollOutcomeAfterSuccess(shot, pressure, state){
    let winP = 0;
    if (shot.intent>=0.4) winP += 0.44;
    if (shot.special==='drop') winP += (R.surface.key==='clay'?0.34:R.surface.key==='grass'?0.46:0.40);
    if (shot.special==='lob' && state.oppAtNet) winP += 0.52;
    winP += Math.max(0,state.momentum)*0.22 + pressure*0.14;
    winP = Math.min(winP, 0.86);
    if (Math.random() < winP) return 'winner';
    const forcedP = 0.05 + pressure*0.30;
    if (Math.random() < forcedP) return 'forced';
    if (pressure < 0.22){
      const atkP = R.surface.key==='clay' ? 0.24 : 0.32;
      if (Math.random() < atkP) return 'oppWinner';
      return 'oppStrong';
    }
    return (Math.random() < 0.28) ? 'oppStrong' : 'oppNeutral';
  }

  function failureMode(shot, prob){
    if (shot.special==='drop' || shot.spin==='slice' || shot.special==='pass' && shot.spin!=='flat') return Math.random()<0.7?'net':'wide';
    if (shot.intent>=0.3 || shot.spin==='flat') return Math.random()<0.6?'long':'wide';
    if (prob<45) return Math.random()<0.55?'net':'wide';
    return ['net','long','wide'][Math.floor(Math.random()*3)];
  }

  function targetFor(shot, state){
    const ux = state.userPos.x;
    const sideSign = ux >= 0 ? 1 : -1;
    let x, z, apex;
    switch (shot.direction){
      case 'crosscourt': x = -sideSign * (shot.depth==='short'?3.6:3.1); break;
      case 'downTheLine': x = sideSign * 3.25; break;
      case 'insideOut': x = -3.4; break;
      case 'insideIn': x = 3.0; break;
      default: x = 0;
    }
    if (shot.special==='drop'){ z = -1.8; apex = 1.9; }
    else if (shot.special==='lob'){ z = -10.4; apex = 6.4; }
    else if (shot.depth==='mid'){ z = -7.2; apex = 2.6; }
    else if (shot.depth==='short'){ z = -4.8; apex = 2.1; }
    else { z = -10.3; apex = shot.spin==='topspin'?3.3 : shot.spin==='slice'?1.9 : 2.3; }
    x += (Math.random()-0.5)*0.7; z += (Math.random()-0.5)*0.8;
    x = THREE.MathUtils.clamp(x, -3.95, 3.95); z = THREE.MathUtils.clamp(z, -11.5, -1.4);
    return { x, z, apex };
  }

  function shotDur(shot, dist){
    const base = dist/ (14 * R.surface.speed);
    let m = 1;
    if (shot.spin==='flat') m = 0.82;
    if (shot.spin==='slice') m = 1.14;
    if (shot.special==='lob') m = 1.5;
    if (shot.special==='drop') m = 1.2;
    if (shot.intent>=0.3) m *= 0.85;
    return THREE.MathUtils.clamp(base*m, 0.55, 1.7);
  }

  return { computeProbability, computePressure, rollOutcomeAfterSuccess, failureMode, targetFor, shotDur, originDepth };
})();

/* =========================== VOICE INPUT =========================== */
const Voice = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false, supported = !!SR;
  function init(onText, onInterim, onStateChange){
    if (!supported) return;
    rec = new SR();
    rec.continuous = false; rec.interimResults = true; rec.lang = 'en-US';
    rec.onresult = (e) => {
      let interim = '', final = '';
      for (let i=e.resultIndex;i<e.results.length;i++){
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript; else interim += r[0].transcript;
      }
      if (interim) onInterim(interim);
      if (final) onText(final);
    };
    rec.onend = () => { listening = false; onStateChange(false); };
    rec.onerror = () => { listening = false; onStateChange(false); };
    rec._stateChange = onStateChange;
  }
  function toggle(){
    if (!rec) return;
    if (listening){ rec.stop(); listening=false; rec._stateChange(false); AudioFX.micOff(); }
    else { try { rec.start(); listening = true; rec._stateChange(true); AudioFX.micOn(); } catch(e){} }
  }
  return { init, toggle, get supported(){ return supported; }, get listening(){ return listening; } };
})();

/* =========================== UI CONTROLLER =========================== */
const UI = (() => {
  const $ = id => document.getElementById(id);
  const liveLabels = [];

  function showScreen(name){
    ['loading','select','game'].forEach(s => $(s).classList.toggle('active', s===name));
    onResize();
  }
  function toast(msg){
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    $('toasts').appendChild(t);
    setTimeout(()=>t.remove(), 2650);
  }
  function bigLabel(text, color){
    const el = $('bigLabel');
    el.textContent = text; el.style.color = color || '#fff';
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }
  function flash(){
    const f = $('flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  }
  function worldLabel(text, world, color){
    const el = document.createElement('div');
    el.className = 'float-label'; el.textContent = text;
    el.style.color = color || '#fff';
    $('labels').appendChild(el);
    const item = { el, world: world.clone() };
    liveLabels.push(item);
    setTimeout(()=>{ el.remove(); const i = liveLabels.indexOf(item); if (i>=0) liveLabels.splice(i,1); }, 1400);
  }
  function tickLabels(){
    if (!liveLabels.length) return;
    for (const l of liveLabels){
      const v = l.world.clone().project(R.camera);
      l.el.style.left = ((v.x*0.5+0.5)*window.innerWidth)+'px';
      l.el.style.top = ((-v.y*0.5+0.5)*window.innerHeight)+'px';
    }
  }
  function setDots(cur){
    const d = $('progressDots'); d.innerHTML='';
    for (let i=0;i<SCENARIOS.length;i++){
      const s = document.createElement('span');
      if (i<cur) s.classList.add('done');
      if (i===cur) s.classList.add('cur');
      d.appendChild(s);
    }
  }
  function setProb(p){
    const arc = $('probArc'), num = $('probNum');
    if (p==null){ arc.style.strokeDashoffset = 207.3; num.innerHTML='–<small>%</small>'; return; }
    arc.style.strokeDashoffset = 207.3 * (1 - p/100);
    arc.style.stroke = p>=70 ? '#39d98a' : p>=45 ? '#ffc24b' : '#ff5d6c';
    num.innerHTML = p+'<small>%</small>';
  }
  function setPills(shot){
    const box = $('pills'); box.innerHTML='';
    if (!shot) return;
    Parser.pillsFor(shot).forEach(([cls,label])=>{
      const s = document.createElement('span');
      s.className = 'pill '+cls; s.textContent = label;
      box.appendChild(s);
    });
  }
  function transcript(text, isHint){
    $('transcript').innerHTML = isHint ? `<span class="hint">${text}</span>` : text;
  }
  function inputPanel(show){
    $('inputPanel').classList.toggle('up', show);
  }
  /* mini court svg in drawer */
  function drawMiniCourt(shots){
    const svg = $('miniCourt');
    const px = x => 60 + x*11, pz = z => 100 + z*7.4;
    let s = `<rect x="${60-4.115*11}" y="${100-11.885*7.4}" width="${8.23*11}" height="${23.77*7.4}" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>
      <line x1="10" y1="100" x2="110" y2="100" stroke="rgba(255,255,255,.4)" stroke-width="1.5"/>
      <line x1="${60-4.115*11}" y1="${pz(-6.4)}" x2="${60+4.115*11}" y2="${pz(-6.4)}" stroke="rgba(255,255,255,.15)"/>
      <line x1="${60-4.115*11}" y1="${pz(6.4)}" x2="${60+4.115*11}" y2="${pz(6.4)}" stroke="rgba(255,255,255,.15)"/>`;
    shots.forEach(sh=>{
      if (!sh.traj) return;
      const c = sh.byUser ? '#4da3ff' : '#ff7a4d';
      const x1 = px(sh.traj.from.x), y1 = pz(sh.traj.from.z), x2 = px(sh.traj.to.x), y2 = pz(sh.traj.to.z);
      s += `<path d="M${x1},${y1} Q${(x1+x2)/2 + (y1<y2?14:-14)},${(y1+y2)/2} ${x2},${y2}" fill="none" stroke="${c}" stroke-width="1.6" opacity="0.85"/>
            <circle cx="${x2}" cy="${y2}" r="2.4" fill="${c}"/>`;
    });
    svg.innerHTML = s;
  }
  function addShotCard(n, desc, prob, resClass, resIcon){
    const el = document.createElement('div');
    el.className = 'shot-card';
    el.innerHTML = `<span class="num">${n}</span><span class="desc">${desc}<small>${prob!=null?prob+'% shot':''}</small></span><span class="res ${resClass}">${resIcon}</span>`;
    $('shotList').prepend(el);
    $('drawerCount').textContent = document.querySelectorAll('#shotList .shot-card').length;
  }
  function clearDrawer(){
    $('shotList').innerHTML=''; $('drawerCount').textContent='0'; drawMiniCourt([]);
  }
  function momentum(v){ // v in [-1,1], + = user
    const f = $('momFill');
    const h = Math.abs(v)*50;
    f.classList.toggle('opp', v<0);
    if (v>=0){ f.style.bottom='50%'; f.style.height = h+'%'; }
    else { f.style.bottom = (50-h)+'%'; f.style.height = h+'%'; }
  }
  return { showScreen, toast, bigLabel, flash, worldLabel, tickLabels, setDots, setProb, setPills, transcript, inputPanel, drawMiniCourt, addShotCard, clearDrawer, momentum, $ };
})();

/* =========================== REPLAY =========================== */
const Replay = {
  active:false, angle:0, playing:false, queue:[], idx:0,
  start(trajectories){
    this.traj = trajectories; this.active = true; this.angle = 0.6;
    clearReplayLines();
    trajectories.forEach(t => drawArcLine(t.from, t.to, t.apex, t.byUser?0x4da3ff:0xff7a4d));
    camTo('overhead', 1.6);
    const rc = UI.$('replayControls');
    rc.querySelectorAll('.shot-jump').forEach(b=>b.remove());
    trajectories.forEach((t,i)=>{
      const b = document.createElement('button');
      b.className = 'rc-btn shot-jump'; b.textContent = (i+1);
      b.onclick = ()=> Replay.playFrom(i);
      rc.appendChild(b);
    });
    this.playFrom(0);
  },
  orbit(dt){
    this.angle += dt*0.12;
    R.camState.tPos = new THREE.Vector3(Math.sin(this.angle)*7, 26, 3+Math.cos(this.angle)*4);
    R.camState.tLook = new THREE.Vector3(0,0,0);
  },
  playFrom(i){
    this.idx = i; this.playing = true;
    this.next();
  },
  next(){
    if (!this.active || !this.playing) return;
    if (this.idx >= this.traj.length){ this.playing = false; return; }
    const t = this.traj[this.idx];
    UI.worldLabel('Shot '+(this.idx+1), new THREE.Vector3(t.to.x, 1.4, t.to.z), t.byUser?'#8fc3ff':'#ffb08a');
    flyBall({ from:{x:t.from.x, y:t.from.y||1, z:t.from.z}, to:{x:t.to.x, z:t.to.z}, apex:t.apex,
      dur: 0.8, color: t.byUser?0x4da3ff:0xff7a4d, spin:'topspin',
      onDone: ()=>{ AudioFX.bounce(R.surface.key); this.idx++; setTimeout(()=>this.next(), 220); } });
  },
  stop(){ this.active = false; this.playing = false; clearReplayLines(); }
};

/* =========================== GAME FLOW =========================== */
const Game = {
  surfaceKey:null, scenIdx:0, state:null, session:[], currentShot:null, busy:false,

  start(surfaceKey){
    if (!initRenderer()) return;
    this.surfaceKey = surfaceKey; this.session = [];
    AudioFX.resume(); AudioFX.crowdBase();
    buildCourt(surfaceKey);
    if (!R.user){ R.user = makePlayer(0x2f6fd0, 0x4da3ff); R.scene.add(R.user); }
    else R.scene.add(R.user);
    if (!R.opp){ R.opp = makePlayer(0xd05a2f, 0xff7a4d); R.scene.add(R.opp); }
    else R.scene.add(R.opp);
    buildBall();
    R.running = true;
    const S = SURFACES[surfaceKey];
    const pill = UI.$('surfacePill');
    pill.textContent = S.label; pill.style.setProperty('--pillbg', S.pill); pill.style.background = S.pill;
    UI.showScreen('game');
    R.camState.pos.set(...CAMS.intro.pos); R.camState.look.set(...CAMS.intro.look);
    camTo('broadcast', 1.2);
    this.loadScenario(0);
  },

  loadScenario(i, isRetry){
    this.scenIdx = i;
    const scn = SCENARIOS[i];
    Replay.stop();
    clearHeatDots();
    UI.$('analytics').classList.remove('show');
    UI.clearDrawer();
    UI.setDots(i);
    UI.$('scenTitle').textContent = `S${scn.id} · ${scn.title}`;
    UI.setProb(null); UI.setPills(null);
    UI.transcript('Tap the mic and call your shot — e.g. "crosscourt deep" or "slice down the line"', true);
    UI.momentum(0);
    this.currentShot = null; this.busy = false;
    UI.$('confirmBtn').disabled = true;
    this.state = {
      scenario: scn,
      userPos: {...scn.userStart}, oppPos: {...scn.oppStart},
      oppAtNet: !!scn.ctx.oppAtNet,
      stretched: !!scn.ctx.stretched,
      isReturn: !!scn.ctx.serveReturn,
      shotNum: 0, momentum: 0,
      shots: [], trajectories: [], probs: []
    };
    placePlayer(R.user, scn.userStart.x, scn.userStart.z);
    placePlayer(R.opp, scn.oppStart.x, scn.oppStart.z);
    R.ball.visible = false;
    R.targetRing.visible = false;
    camTo('broadcast', isRetry ? 3 : 1.6);
    // intro overlay
    const intro = UI.$('intro');
    UI.$('introTier').textContent = `Tier ${scn.tier} · ${scn.tierName}`;
    UI.$('introTier').className = 'intro-tier tier-'+scn.tier;
    UI.$('introTitle').textContent = scn.title;
    UI.$('introDesc').textContent = scn.desc;
    UI.$('introNum').textContent = `Scenario ${scn.id} of ${SCENARIOS.length}`;
    intro.classList.remove('hide'); intro.classList.add('show');
    setTimeout(()=>{ intro.classList.add('hide'); setTimeout(()=>intro.classList.remove('show','hide'), 460); }, 2100);
    setTimeout(()=> this.animateIncoming(scn.incoming, ()=> this.promptInput()), 2300);
  },

  animateIncoming(inc, cb){
    const st = this.state;
    R.ball.visible = true;
    const from = { x: inc.from.x, y: inc.serve ? 2.9 : 1.1, z: inc.from.z };
    if (inc.serve) swingPlayer(R.opp, 'serve'); else swingPlayer(R.opp, 'fh');
    const dur = Engine.shotDur({spin:'flat', intent: inc.serve?0.3:0}, 22) / (inc.pace||1);
    st.trajectories.push({ from, to:{x:inc.land.x, z:inc.land.z}, apex:inc.apex, byUser:false });
    flyBall({ from, to: inc.land, apex: inc.apex, dur, color:0xff7a4d, spin:'topspin',
      onDone: ()=>{
        AudioFX.bounce(this.surfaceKey); ballSquash();
        if (this.surfaceKey==='clay') spawnParticles(R.ball.position, 0xc97a50, 6, 1.4, 1.2);
        // ball continues to user's contact point
        const cp = { x: st.userPos.x, z: Math.max(st.userPos.z - 0.9, inc.land.z+1.5) };
        movePlayer(R.user, st.userPos.x, st.userPos.z, 0.45);
        flyBall({ from:{x:inc.land.x, y:0.11, z:inc.land.z}, to: cp, toY: 0.9,
          apex: 1.15*R.surface.bounce, dur: 0.5/(inc.pace||1), color:0xff7a4d, spin:'topspin',
          onDone: cb });
      }});
  },

  promptInput(){
    this.busy = false;
    UI.inputPanel(true);
    const n = this.state.shotNum+1;
    if (n>1) UI.transcript(`Shot ${n} — call it.`, true);
  },

  /* voice / text handling */
  onSpeech(text){
    UI.transcript('“'+text+'”');
    const shot = Parser.parse(text);
    if (!shot.recognized){
      UI.toast('Try something like "crosscourt deep" or "slice down the line"');
      UI.setPills(null); UI.setProb(null);
      this.currentShot = null; UI.$('confirmBtn').disabled = true;
      return;
    }
    AudioFX.parsed();
    this.setShot(shot);
  },
  setShot(shot){
    this.currentShot = shot;
    UI.setPills(shot);
    const { p, tag } = Engine.computeProbability(shot, this.state);
    shot._prob = p; shot._tag = tag;
    UI.setProb(p);
    UI.$('confirmBtn').disabled = false;
    // show target ring
    const t = Engine.targetFor(shot, this.state);
    shot._target = t;
    R.targetRing.position.set(t.x, 0.02, t.z);
    const col = p>=70 ? 0x39d98a : p>=45 ? 0xffc24b : 0xff5d6c;
    R.targetRing.userData.ring.material.color.setHex(col);
    R.targetRing.userData.fill.material.color.setHex(col);
    R.targetRing.visible = true;
    if (p<40) UI.toast("That's a gamble…");
  },
  clearShot(){
    this.currentShot = null;
    UI.setPills(null); UI.setProb(null);
    UI.transcript('Changed your mind. Call the new shot.', true);
    UI.$('confirmBtn').disabled = true;
    R.targetRing.visible = false;
  },

  confirm(){
    if (!this.currentShot || this.busy) return;
    this.busy = true;
    AudioFX.ui();
    UI.inputPanel(false);
    const shot = this.currentShot, st = this.state;
    const prob = shot._prob;
    const success = Math.random()*100 < prob;
    const t = shot._target;
    st.shotNum++;
    st.probs.push(prob);
    const desc = Parser.describe(shot);
    const isBh = (st.userPos.x < -0.6);
    swingPlayer(R.user, shot.special==='drop' ? 'volley' : isBh ? 'bh' : 'fh');
    setTimeout(()=> R.targetRing.visible = false, 700);
    const from = { x: st.userPos.x, y: 1.0, z: st.userPos.z - 0.6 };
    const dur = Engine.shotDur(shot, Math.hypot(t.x-from.x, t.z-from.z));
    if (shot.intent>=0.3 && shot.spin==='flat') camShake(0.25 + shot.intent*0.3);

    if (success){
      st.trajectories.push({ from, to:{x:t.x,z:t.z}, apex:t.apex, byUser:true });
      const pressure = Engine.computePressure(shot, st);
      st.momentum = THREE.MathUtils.clamp(st.momentum + (pressure-0.3)*0.42, -1, 1);
      const rec = { desc, prob, result:'in', pressure, byUser:true, traj:{from, to:t} };
      st.shots.push(rec);
      flyBall({ from, to:t, apex:t.apex, dur, color:0x4da3ff, spin:shot.spin,
        onDone: ()=>{
          AudioFX.bounce(this.surfaceKey); ballSquash();
          addHeatDot(t.x, t.z, 0x4da3ff);
          if (this.surfaceKey==='clay') spawnParticles(R.ball.position, 0xc97a50, 5, 1.2, 1);
          this.afterSuccess(shot, pressure, rec);
        }});
      // opponent scrambles toward it
      movePlayer(R.opp, THREE.MathUtils.clamp(t.x,-3.8,3.8), st.oppAtNet ? st.oppPos.z : Math.min(t.z+1.2,-8.6), dur*0.95);
      UI.momentum(st.momentum);
    } else {
      const mode = Engine.failureMode(shot, prob);
      const rec = { desc, prob, result:mode, pressure:0, byUser:true, traj:{from, to:t} };
      st.shots.push(rec);
      this.animateFailure(shot, from, t, dur, mode, rec);
    }
    UI.addShotCard(st.shotNum, desc, prob, success?'ok':'bad', success?'✓':'✕');
    UI.drawMiniCourt(st.shots);
    if (Voice.listening) Voice.toggle();
  },

  animateFailure(shot, from, t, dur, mode, rec){
    const st = this.state;
    if (mode==='net'){
      const nt = { x: THREE.MathUtils.lerp(from.x, t.x, Math.abs(from.z)/(Math.abs(from.z)+Math.abs(t.z))), z: 0.02 };
      st.trajectories.push({ from, to:{x:nt.x,z:0.4}, apex:0.8, byUser:true });
      rec.traj = { from, to:{x:nt.x, z:0} };
      flyBall({ from, to: nt, toY: 0.7, apex: 0.9, dur: dur*0.55, color:0x4da3ff, spin:shot.spin,
        onDone: ()=>{
          AudioFX.netCord();
          // net ripple
          const net = R.netMesh;
          let k = 0; const iv = setInterval(()=>{ k++; net.position.z = Math.sin(k*1.4)*0.05*(1-k/10); if (k>=10){ clearInterval(iv); net.position.z=0; } }, 40);
          UI.worldLabel('NET', new THREE.Vector3(nt.x, 1.5, 0), '#ff9aa4');
          flyBall({ from:{x:nt.x, y:0.7, z:0.02}, to:{x:nt.x, z:0.55}, toY:0.11, apex:0.75, dur:0.4, color:0x4da3ff, spin:'flat',
            onDone: ()=> this.endPoint(false, 'net', rec) });
        }});
    } else {
      const ox = mode==='wide' ? (t.x>0? 4.9 : -4.9) + (Math.random()-0.5)*0.5 : t.x;
      const oz = mode==='long' ? -13.4 - Math.random() : Math.min(t.z, -6) - Math.random();
      st.trajectories.push({ from, to:{x:ox,z:oz}, apex:t.apex+0.4, byUser:true });
      rec.traj = { from, to:{x:ox, z:oz} };
      flyBall({ from, to:{x:ox, z:oz}, apex:t.apex+0.5, dur, color:0x4da3ff, spin:shot.spin,
        onDone: ()=>{
          AudioFX.bounce(this.surfaceKey); AudioFX.out();
          spawnParticles(R.ball.position, 0xffffff, 8, 1.6, 1.4);
          UI.worldLabel(mode==='long'?'LONG':'OUT!', new THREE.Vector3(ox, 1.4, oz), '#ff9aa4');
          this.endPoint(false, mode, rec);
        }});
    }
  },

  afterSuccess(shot, pressure, rec){
    const st = this.state;
    AudioFX.rally(st.shotNum);
    const outcome = Engine.rollOutcomeAfterSuccess(shot, pressure, st);
    // opponent pressure body language
    R.opp.userData.lean = pressure>0.6 ? 0.8 : pressure<0.25 ? -0.3 : 0.2;

    if (outcome==='winner'){
      rec.result = 'winner';
      swingPlayer(R.opp, 'drop');
      return this.endPoint(true, 'winner', rec);
    }
    if (outcome==='forced'){
      rec.result = 'forced';
      // opponent shanks the reply
      swingPlayer(R.opp, 'bh');
      const fx = st.oppPos.x + (Math.random()-0.5)*2;
      const wideOut = Math.random()<0.5;
      const target = wideOut ? {x: fx>0?5.2:-5.2, z: 8+Math.random()*3} : {x: fx*0.4, z: -0.02};
      setTimeout(()=>{
        flyBall({ from:{x:R.opp.position.x, y:1, z:R.opp.position.z+0.5}, to:target, toY: wideOut?0.11:0.7, apex: wideOut?2.4:0.8, dur:0.8, color:0xff7a4d, spin:'flat',
          onDone: ()=>{
            if (!wideOut){ AudioFX.netCord(); UI.worldLabel('NET', new THREE.Vector3(target.x,1.4,0), '#ffc9a4'); }
            else { AudioFX.out(); UI.worldLabel('OUT!', new THREE.Vector3(target.x,1.4,target.z), '#ffc9a4'); }
            this.endPoint(true, 'forced', rec);
          }});
      }, 350);
      return;
    }
    if (outcome==='oppWinner'){
      // you fed them a short one and they put it away
      setTimeout(()=>{
        swingPlayer(R.opp, 'fh');
        movePlayer(R.opp, R.opp.position.x*0.5, -5.5, 0.5);
        const target = { x: st.userPos.x > 0 ? -3.4 : 3.4, z: 10.8 };
        st.trajectories.push({ from:{x:R.opp.position.x, y:1.1, z:R.opp.position.z}, to:target, apex:2.0, byUser:false });
        flyBall({ from:{x:R.opp.position.x, y:1.1, z:R.opp.position.z}, to:target, apex:2.0, dur:0.75, color:0xff7a4d, spin:'flat',
          onDone: ()=>{
            AudioFX.bounce(this.surfaceKey);
            UI.worldLabel('TOO GOOD', new THREE.Vector3(target.x,1.4,target.z), '#ffc9a4');
            this.endPoint(false, 'oppWinner', rec);
          }});
      }, 420);
      return;
    }
    // rally continues — opponent replies
    st.shotNum >= st.scenario.maxShots ? this.forceResolution(rec) : this.opponentReply(outcome==='oppStrong');
  },

  opponentReply(strong){
    const st = this.state;
    st.isReturn = false;
    if (st.oppAtNet && Math.random()<0.5) st.oppAtNet = false; // lob/pass survived → they retreat
    if (strong) st.momentum = THREE.MathUtils.clamp(st.momentum - 0.18, -1, 1);
    UI.momentum(st.momentum);
    const toX = strong ? (st.userPos.x >= 0 ? -3.4 : 3.4) : (Math.random()*5-2.5);
    const land = { x: THREE.MathUtils.clamp(toX,-3.9,3.9), z: strong ? 10.6 : 9.2+Math.random()*1.6 };
    st.stretched = strong && Math.abs(land.x) > 2.6;
    if (strong) UI.toast('Strong reply — you\'re on the back foot');
    setTimeout(()=>{
      const oppFrom = { x: R.opp.position.x, y: 1.05, z: R.opp.position.z + 0.4 };
      swingPlayer(R.opp, R.opp.position.x < 0 ? 'bh' : 'fh');
      st.trajectories.push({ from:oppFrom, to:land, apex: strong?2.4:3.0, byUser:false });
      st.shots.push({ desc:'Opponent reply', byUser:false, traj:{from:oppFrom, to:land} });
      flyBall({ from:oppFrom, to:land, apex: strong?2.4:3.0, dur: Engine.shotDur({spin: strong?'flat':'topspin', intent: strong?0.3:0}, 21), color:0xff7a4d, spin:'topspin',
        onDone: ()=>{
          AudioFX.bounce(this.surfaceKey); ballSquash();
          addHeatDot(land.x, land.z, 0xff7a4d);
          // new user position = intercept
          st.userPos = { x: land.x, z: Math.min(land.z + 1.4, 12.8) };
          movePlayer(R.user, st.userPos.x, st.userPos.z, 0.55);
          const cp = { x: st.userPos.x, z: st.userPos.z - 0.9 };
          flyBall({ from:{x:land.x, y:0.11, z:land.z}, to:cp, toY:0.95, apex: 1.2*R.surface.bounce, dur:0.5,
            color:0xff7a4d, spin:'topspin', onDone: ()=> this.promptInput() });
        }});
    }, 500);
  },

  forceResolution(rec){
    const st = this.state;
    UI.toast('The rally hits boiling point…');
    R.timeScale = 0.45;
    setTimeout(()=>{
      R.timeScale = 1;
      const winP = 0.5 + st.momentum*0.35;
      const win = Math.random() < winP;
      this.endPoint(win, win?'grind':'grindLoss', rec);
    }, 1300);
  },

  endPoint(win, how, lastRec){
    const st = this.state;
    this.busy = true;
    R.opp.userData.lean = 0;
    const scn = st.scenario;
    if (scn.ctx.matchPoint){ R.timeScale = 0.35; setTimeout(()=>R.timeScale=1, 900); }
    const HOW = {
      winner:   ['WINNER!', '#39d98a', 'Clean winner — they never touched it'],
      forced:   ['FORCED ERROR', '#39d98a', 'Your pressure broke their reply'],
      grind:    ['POINT WON', '#39d98a', 'The grind paid off — momentum carried you'],
      net:      ['NET', '#ff5d6c', 'Into the tape'],
      long:     ['LONG', '#ff5d6c', 'Sailed past the baseline'],
      wide:     ['OUT', '#ff5d6c', 'Missed the paint'],
      oppWinner:['PASSED BY', '#ff5d6c', 'You fed a short ball — they punished it'],
      grindLoss:['OUTLASTED', '#ff5d6c', 'The rally slipped away — momentum wasn\'t yours']
    };
    const [label, color, sub] = HOW[how] || ['POINT OVER','#fff',''];
    setTimeout(()=>{
      UI.bigLabel(label, color);
      if (win){
        AudioFX.winner(); UI.flash();
        swingPlayer(R.user, 'fist');
        spawnParticles(new THREE.Vector3(R.ball.position.x, 0.4, R.ball.position.z), 0x9fe8c3, 20, 3.2, 2.6);
        if (how==='winner') { camTo('side', 3.0); setTimeout(()=>camTo('broadcast',1.8), 1100); }
      } else {
        AudioFX.lossSting();
        swingPlayer(R.user, 'drop');
      }
      const userShots = st.shots.filter(s=>s.byUser);
      const avg = Math.round(userShots.reduce((a,s)=>a+s.prob,0) / Math.max(userShots.length,1));
      const record = {
        scenario: scn, win, how, sub,
        shots: userShots, avgProb: avg,
        trajectories: st.trajectories.slice(),
        momentum: st.momentum
      };
      this.session[this.scenIdx] = record;
      setTimeout(()=> Analytics.show(record), 1700);
    }, 500);
  }
};

/* =========================== ANALYTICS =========================== */
const Analytics = {
  reviewMode:false,
  show(record, fromSummary){
    this.reviewMode = !!fromSummary;
    const an = UI.$('analytics');
    UI.inputPanel(false);
    UI.$('anResult').textContent = record.win ? '✓ '+(record.how==='winner'?'WINNER!':record.how==='forced'?'FORCED ERROR':'POINT WON') : '✕ POINT LOST';
    UI.$('anResult').className = 'result ' + (record.win?'win':'loss');
    UI.$('anSub').textContent = record.sub;
    // table
    const tb = UI.$('shotTable'); tb.innerHTML='';
    record.shots.forEach((s,i)=>{
      const resTxt = s.result==='in'?'✓ In' : s.result==='winner'?'✓ WIN' : s.result==='forced'?'✓ Forced err' : '✕ '+(s.result==='net'?'Net':s.result==='long'?'Long':'Wide');
      const resCol = (s.result==='net'||s.result==='long'||s.result==='wide') ? 'var(--danger)' : 'var(--accent2)';
      const pw = Math.round((s.pressure||0)*100);
      tb.insertAdjacentHTML('beforeend',
        `<tr><td class="mono" style="color:var(--text-faint)">${i+1}</td><td>${s.desc}</td>
         <td class="prob">${s.prob}%</td><td style="color:${resCol}">${resTxt}</td>
         <td><span class="pbar"><i style="width:${pw}%"></i></span><span class="mono" style="font-size:11px;color:var(--text-dim)">${pw>66?'High':pw>36?'Med':'Low'}</span></td></tr>`);
    });
    // risk scale
    const opt = record.scenario.optimal;
    UI.$('riskYou').style.left = (100 - record.avgProb) + '%';
    UI.$('riskOpt').style.left = (100 - opt.avg) + '%';
    // engine analysis
    UI.$('anOptimal').textContent = 'Optimal: ' + opt.seq + ' · EV ' + opt.avg + '%';
    UI.$('anQuote').textContent = this.verdictText(record);
    const badge = this.badge(record);
    UI.$('anBadge').textContent = badge;
    // nav
    const last = Game.scenIdx >= SCENARIOS.length-1;
    UI.$('anNext').textContent = this.reviewMode ? '← Back to Summary' : (last ? 'See Session Summary →' : 'Next Scenario →');
    an.classList.add('show');
    Replay.start(record.trajectories);
  },
  verdictText(r){
    const opt = r.scenario.optimal;
    const risky = r.shots.filter(s=>s.prob<50);
    const lastShot = r.shots[r.shots.length-1];
    let s = '';
    if (r.win && risky.length && lastShot.prob<50)
      s = `You went for a ${lastShot.prob}% ball when safer patterns were on the table — and it landed. High risk, high reward. `;
    else if (r.win && r.avgProb>=opt.avg-4)
      s = `You played percentage tennis — an average of ${r.avgProb}% per shot, right on the optimal line. Smart, repeatable, efficient. `;
    else if (r.win)
      s = `You won it, but at ${r.avgProb}% average shot quality vs the ${opt.avg}% optimal path. It worked today; over 100 points, the engine takes the other side of that bet. `;
    else if (!r.win && lastShot && lastShot.prob<45)
      s = `The point died on a ${lastShot.prob}% attempt (${lastShot.desc.toLowerCase()}). The engine had higher-value patterns available. `;
    else if (!r.win)
      s = `No shame in this one — you chose reasonably (${r.avgProb}% avg) and the probability engine still collected. Variance is real. `;
    s += opt.note;
    return s;
  },
  badge(r){
    const risky = r.shots.filter(s=>s.prob<50).length, n = r.shots.length;
    if (r.avgProb>=74) return '📐 Percentage Player';
    if (risky/Math.max(n,1) > 0.5) return '🎲 Riverboat Gambler';
    if (r.win && risky>0) return '🎯 Calculated Aggressor';
    if (!r.win && r.avgProb>=68) return '🧱 Solid, Unlucky';
    return '⚡ First-Strike Player';
  },
  close(){ UI.$('analytics').classList.remove('show'); Replay.stop(); }
};

/* =========================== SUMMARY =========================== */
const Summary = {
  data:null,
  compute(){
    const recs = Game.session.filter(Boolean);
    const wins = recs.filter(r=>r.win).length;
    const all = recs.flatMap(r=>r.shots);
    const avg = Math.round(all.reduce((a,s)=>a+s.prob,0)/Math.max(all.length,1));
    const riskShare = all.filter(s=>s.prob<55).length/Math.max(all.length,1);
    const iq = Math.round(recs.reduce((a,r)=>a+Math.max(20, 100-Math.abs(r.avgProb-r.scenario.optimal.avg)*2.4),0)/Math.max(recs.length,1));
    const defScens = recs.filter(r=>[2,5,6].includes(r.scenario.id));
    const defense = Math.round(30 + (defScens.filter(r=>r.win).length/Math.max(defScens.length,1))*60);
    const aggression = Math.round(THREE.MathUtils.clamp(riskShare*130 + 15, 15, 95));
    const okShots = all.filter(s=>s.result!=='net'&&s.result!=='long'&&s.result!=='wide');
    const pressureAxis = Math.round(THREE.MathUtils.clamp(okShots.reduce((a,s)=>a+(s.pressure||0),0)/Math.max(okShots.length,1)*130, 10, 95));
    const s8 = Game.session[7];
    const clutch = s8 ? (s8.win ? 88 : 34) : 50;
    // style
    const sliceShare = all.filter(s=>s.desc.includes('Slice')||s.desc.includes('Drop')).length/Math.max(all.length,1);
    let style, styleDesc, pro, flag;
    if (aggression>58 && iq>60){ style='Calculated Aggressor'; pro='Carlos Alcaraz'; flag='🇪🇸';
      styleDesc='You take risks — but only when the geometry supports it. You build with percentage balls, then strike early the moment a door opens.'; }
    else if (aggression>58){ style='Riverboat Gambler'; pro='Nick Kyrgios'; flag='🇦🇺';
      styleDesc='You see a 35% winner and you feel the 35%, not the 65%. Electric when it lands. The engine, quietly, is taking notes.'; }
    else if (sliceShare>0.3){ style='The Craftsman'; pro='Roger Federer'; flag='🇨🇭';
      styleDesc='Slices, drops, changes of pace — you play tennis like a card game, disguising intent and stealing time.'; }
    else if (aggression<38 && defense>62){ style='The Wall'; pro='Novak Djokovic'; flag='🇷🇸';
      styleDesc='You give nothing away. Depth, patience, and the quiet conviction that the error will come from the other side. It usually does.'; }
    else if (Game.surfaceKey==='clay' && avg>=68){ style='Clay Grinder'; pro='Rafael Nadal'; flag='🇪🇸';
      styleDesc='Heavy patterns, heavy legs, heavy topspin. You treat every rally as a negotiation you refuse to lose.'; }
    else { style='Balanced Operator'; pro='Jannik Sinner'; flag='🇮🇹';
      styleDesc='No obvious lean — you read each situation on its merits and pick the sound option more often than not. Quietly dangerous.'; }
    // best & worst
    let best=null, worst=null;
    recs.forEach(r=>r.shots.forEach(s=>{
      const good = s.result==='winner'||s.result==='forced'||s.result==='in';
      if (good && (!best || s.prob<best.s.prob) && (s.result!=='in'||s.pressure>0.6)) best={r,s};
      if (!good && (!worst || s.prob<worst.s.prob)) worst={r,s};
    }));
    this.data = { recs, wins, avg, iq, defense, aggression, pressureAxis, clutch, style, styleDesc, pro, flag, best, worst, riskShare };
    return this.data;
  },
  show(){
    const d = this.compute();
    Analytics.close();
    UI.$('sumSub').textContent = `${SURFACES[Game.surfaceKey].slam} · ${SURFACES[Game.surfaceKey].label} · ${d.recs.length} scenarios played`;
    UI.$('sumWins').textContent = d.wins + '/' + d.recs.length;
    UI.$('sumAvg').textContent = d.avg + '%';
    UI.$('styleName').textContent = d.style;
    UI.$('styleDesc').textContent = d.styleDesc;
    UI.$('proLine').innerHTML = `Pro comparison: most similar to <b>${d.pro} ${d.flag}</b>`;
    // dots
    const dots = UI.$('scenDots'); dots.innerHTML='';
    Game.session.forEach((r,i)=>{
      if (!r) return;
      const b = document.createElement('button');
      b.className = 'sdot ' + (r.win?'w':'l');
      b.textContent = `S${i+1} ${r.win?'✓':'✕'}`;
      b.onclick = ()=>{ UI.$('summary').classList.remove('show'); Game.scenIdx = i; Analytics.show(r, true); };
      dots.appendChild(b);
    });
    let bw = '';
    if (d.best) bw += `<b>Best call:</b> S${d.best.r.scenario.id} — ${d.best.s.desc.toLowerCase()} at ${d.best.s.prob}% (${d.best.s.result==='winner'?'clean winner':'it landed and hurt'}).<br>`;
    if (d.worst) bw += `<b>Worst call:</b> S${d.worst.r.scenario.id} — ${d.worst.s.desc.toLowerCase()} at ${d.worst.s.prob}%. The engine warned you.`;
    UI.$('bestWorst').innerHTML = bw || 'A clean session — nothing reckless, nothing timid.';
    UI.$('sumRiskYou').style.left = THREE.MathUtils.clamp(d.riskShare*100+8, 4, 96) + '%';
    // radar
    const axes = ['Shot IQ','Defense','Aggression','Pressure','Clutch'];
    const vals = [d.iq, d.defense, d.aggression, d.pressureAxis, d.clutch];
    drawRadar(UI.$('radar'), axes, vals, false);
    drawRadar(UI.$('shareRadar'), axes, vals, true);
    // share card
    UI.$('shareStats').textContent = `${d.wins}/${d.recs.length} points · ${d.avg}% avg · ${SURFACES[Game.surfaceKey].slam} (${SURFACES[Game.surfaceKey].label})`;
    UI.$('shareStyle').textContent = 'Style: ' + d.style;
    UI.$('sharePro').textContent = 'Pro match: ' + d.pro;
    UI.$('summary').classList.add('show');
    UI.$('summary').scrollTop = 0;
  }
};
function drawRadar(canvas, axes, vals, small){
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, cx = W/2, cy = H/2, rMax = Math.min(W,H)/2 - (small?10:36);
  ctx.clearRect(0,0,W,H);
  const n = axes.length;
  const pt = (i, r) => [cx + r*Math.sin(i/n*2*Math.PI), cy - r*Math.cos(i/n*2*Math.PI)];
  // grid
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
  for (let ring=1; ring<=4; ring++){
    ctx.beginPath();
    for (let i=0;i<=n;i++){ const [x,y] = pt(i%n, rMax*ring/4); i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
    ctx.stroke();
  }
  for (let i=0;i<n;i++){ const [x,y]=pt(i,rMax); ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(x,y); ctx.stroke(); }
  // polygon
  ctx.beginPath();
  for (let i=0;i<=n;i++){ const [x,y] = pt(i%n, rMax*vals[i%n]/100); i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
  const grad = ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0,'rgba(94,176,255,0.45)'); grad.addColorStop(1,'rgba(57,217,138,0.45)');
  ctx.fillStyle = grad; ctx.fill();
  ctx.strokeStyle = '#7cc0ff'; ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(94,176,255,0.8)'; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
  // labels
  if (!small){
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '11px "JetBrains Mono", monospace'; ctx.textAlign='center';
    for (let i=0;i<n;i++){ const [x,y]=pt(i,rMax+20); ctx.fillText(axes[i], x, y+4); }
  }
}

/* =========================== TUTORIAL =========================== */
const Tutorial = {
  steps: [
    { emoji:'🎤', title:'Speak your shot', text:'Tap the mic (or press Space) and call your shot like a coach would: "crosscourt deep", "slice down the line", "drop shot", "inside-out — go for it". No mic? Type it instead.' },
    { emoji:'📊', title:'Watch the probability', text:'Every shot gets a live success probability based on your position, the surface, and how ambitious you\'re being. Green is percentage tennis. Red is a prayer.' },
    { emoji:'✓', title:'Confirm — or chicken out', text:'Lock it in with Confirm, or Change My Mind to re-call it. After each point, a chess-style engine shows you the optimal sequence and grades your choices.' }
  ],
  idx:0, onDone:null,
  show(onDone){
    this.idx = 0; this.onDone = onDone || null;
    this.render();
    UI.$('tutorial').classList.add('show');
  },
  render(){
    const s = this.steps[this.idx];
    UI.$('tutNum').textContent = `Step ${this.idx+1} of ${this.steps.length}`;
    UI.$('tutEmoji').textContent = s.emoji;
    UI.$('tutTitle').textContent = s.title;
    UI.$('tutText').textContent = s.text;
    UI.$('tutNext').textContent = this.idx === this.steps.length-1 ? 'Got it' : 'Next';
  },
  next(){
    if (this.idx < this.steps.length-1){ this.idx++; this.render(); }
    else this.finish();
  },
  finish(){
    UI.$('tutorial').classList.remove('show');
    try { localStorage.setItem('tennisTutSeen','1'); } catch(e){}
    if (this.onDone){ const f = this.onDone; this.onDone = null; f(); }
  }
};

/* =========================== WIRING & INIT =========================== */
(function init(){
  const $ = id => document.getElementById(id);

  // Voice
  Voice.init(
    text => Game.onSpeech(text),
    interim => UI.transcript('“'+interim+'…”'),
    on => { $('micBtn').classList.toggle('listening', on); $('wave').classList.toggle('on', on); }
  );
  if (!Voice.supported){
    $('micBtn').disabled = true;
    $('micBtn').title = 'Speech recognition not supported in this browser — type your shot below';
  }

  $('micBtn').addEventListener('click', ()=>{ AudioFX.resume(); Voice.toggle(); });
  document.addEventListener('keydown', e=>{
    if (e.code==='Space' && $('game').classList.contains('active') && document.activeElement !== $('textInput') && !$('analytics').classList.contains('show')){
      e.preventDefault(); AudioFX.resume(); Voice.toggle();
    }
    if (e.code==='Enter' && document.activeElement === $('textInput')) submitText();
  });
  function submitText(){
    const v = $('textInput').value.trim();
    if (!v) return;
    Game.onSpeech(v);
    $('textInput').value='';
  }
  $('textGo').addEventListener('click', submitText);
  $('confirmBtn').addEventListener('click', ()=> Game.confirm());
  $('changeBtn').addEventListener('click', ()=> Game.clearShot());

  // drawer
  $('drawerTab').addEventListener('click', ()=>{ $('drawer').classList.add('open'); $('drawerTab').classList.add('hidden'); });
  $('drawerClose').addEventListener('click', ()=>{ $('drawer').classList.remove('open'); $('drawerTab').classList.remove('hidden'); });

  // sound toggles
  function setSound(on){
    AudioFX.setEnabled(on);
    $('soundToggleSel').classList.toggle('off', !on);
    $('soundToggleSel').textContent = on ? '🔊 Sound' : '🔇 Sound';
    $('soundToggleGame').classList.toggle('off', !on);
    $('soundToggleGame').textContent = on ? '🔊' : '🔇';
  }
  let soundOn = true;
  try { soundOn = localStorage.getItem('tennisSound') !== '0'; } catch(e){}
  setSound(soundOn);
  [$('soundToggleSel'), $('soundToggleGame')].forEach(b=> b.addEventListener('click', ()=>{
    soundOn = !soundOn; setSound(soundOn);
    try { localStorage.setItem('tennisSound', soundOn?'1':'0'); } catch(e){}
  }));

  // surface cards
  document.querySelectorAll('.court-card').forEach(card=>{
    card.addEventListener('click', ()=>{
      const key = card.dataset.surface;
      AudioFX.resume(); AudioFX.whoosh();
      let seen = false;
      try { seen = localStorage.getItem('tennisTutSeen')==='1'; } catch(e){}
      if (!seen) Tutorial.show(()=> Game.start(key));
      else Game.start(key);
    });
  });
  $('howToBtn').addEventListener('click', ()=> Tutorial.show(null));
  $('tutNext').addEventListener('click', ()=> Tutorial.next());
  $('tutSkip').addEventListener('click', ()=> Tutorial.finish());

  // analytics nav
  $('anRetry').addEventListener('click', ()=>{ Analytics.close(); Game.loadScenario(Game.scenIdx, true); });
  $('anNext').addEventListener('click', ()=>{
    if (Analytics.reviewMode){ Analytics.close(); Summary.show(); return; }
    Analytics.close();
    if (Game.scenIdx >= SCENARIOS.length-1) Summary.show();
    else Game.loadScenario(Game.scenIdx+1);
  });
  $('replayBtn').addEventListener('click', ()=> Replay.playFrom(0));

  // summary
  $('playAgain').addEventListener('click', ()=>{ $('summary').classList.remove('show'); Game.start(Game.surfaceKey); });
  $('newSurface').addEventListener('click', ()=>{ $('summary').classList.remove('show'); R.running=false; UI.showScreen('select'); });
  $('copyCard').addEventListener('click', ()=>{
    const d = Summary.data; if (!d) return;
    const txt = `🎾 MY TENNIS BRAIN\n${d.wins}/${d.recs.length} points · ${d.avg}% avg · ${SURFACES[Game.surfaceKey].slam} (${SURFACES[Game.surfaceKey].label})\nStyle: ${d.style}\nPro match: ${d.pro}\n— tennis point sim by Seshasayi Rangaraj`;
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(()=>UI.toast('Card copied to clipboard'));
  });

  // boot — reveal the menu as soon as the DOM is parsed. Do NOT wait for the
  // window 'load' event: if the Three.js CDN or Google Fonts request stalls,
  // 'load' can hang and leave the spinner stuck. This script is the last thing
  // in <body>, so the DOM is already ready here.
  let booted = false;
  function boot(){
    if (booted) return; booted = true;
    try { if (typeof THREE !== 'undefined') initPreviews(); } catch(err){ console.warn('preview init skipped:', err); }
    UI.showScreen('select');
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 150));
  } else {
    setTimeout(boot, 150);
  }
  setTimeout(boot, 1500); // hard safety net — menu appears no matter what
})();

