/* CONTOUR — a real Three.js voxel-terrain digital twin.
   Procedural heightfield -> carved rivers -> biome-coloured InstancedMesh slab,
   translucent water, drifting clouds, scroll-driven camera flythrough + annotations. */
(function(){
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1, 1.75));
const PAPER = 0xece6da;
const scene = new THREE.Scene();
scene.background = new THREE.Color(PAPER);
scene.fog = new THREE.Fog(PAPER, 150, 340);
const cam = new THREE.PerspectiveCamera(40, innerWidth/innerHeight, 1, 1000);

/* ---------- value noise / fbm ---------- */
function hash(x,y){ let h=(x|0)*374761393 + (y|0)*668265263; h=(h^(h>>13))*1274126177; return ((h^(h>>16))>>>0)/4294967295; }
function vnoise(x,y){ const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;
  const u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  const a=hash(xi,yi),b=hash(xi+1,yi),c=hash(xi,yi+1),d=hash(xi+1,yi+1);
  return a*(1-u)*(1-v)+b*u*(1-v)+c*(1-u)*v+d*u*v; }
function fbm(x,y,oct){ let s=0,a=0.5,f=1,n=0; for(let i=0;i<(oct||5);i++){ s+=a*vnoise(x*f,y*f); n+=a; f*=2; a*=0.5; } return s/n; }

/* ---------- terrain generation ---------- */
const N = innerWidth<720 ? 116 : 150;
const CELL = 1, STEP = 1, LEVELS = 30, waterFrac = 0.18, snowStart = 0.88;
const half = N/2;
function riverX(nz){ return 0.52 + 0.15*Math.sin(nz*6.2831*1.15+0.6) + 0.07*Math.sin(nz*6.2831*2.7+1.9); }
function riverX2(nz){ return 0.30 + 0.10*Math.sin(nz*6.2831*1.6+2.2); }

const E = new Float32Array(N*N);
let emin=1e9, emax=-1e9;
for(let j=0;j<N;j++){ for(let i=0;i<N;i++){
  const nx=i/N, nz=j/N;
  let e = 0.55*fbm(nx*3.0+11, nz*3.0+7, 5) + 0.35*fbm(nx*1.3+40, nz*1.3+21, 4);
  e += 0.20*(nz*0.7 + 0.3);                         // range rising gently toward the back
  e += 0.13*Math.pow(fbm(nx*0.8+70, nz*0.8+61, 3), 1.6);
  // carve the main river + a tributary that joins mid-map
  let carve = Math.max(0, 1 - Math.abs(nx-riverX(nz))/0.055);
  if(nz>0.32 && nz<0.9){ carve = Math.max(carve, (1-Math.abs(nx-riverX2(nz))/0.045) * Math.min(1,(nz-0.32)/0.4)); }
  carve = Math.min(1, carve);
  e = e*(1-0.92*carve) - 0.10*carve;
  E[j*N+i]=e; if(e<emin)emin=e; if(e>emax)emax=e;
}}
const inv = 1/(emax-emin);
// quantise to voxel heights
const Hv = new Int16Array(N*N); let maxVox=1;
for(let k=0;k<N*N;k++){ let nh=(E[k]-emin)*inv; nh=Math.pow(nh,1.45); const h=1+Math.round(nh*(LEVELS-1)); Hv[k]=h; if(h>maxVox)maxVox=h; }
const waterVox = 1 + Math.round(waterFrac*(LEVELS-1));
const snowVox  = waterVox + Math.round(snowStart*(maxVox-waterVox));

/* ---------- voxel slab (InstancedMesh) ---------- */
const geo = new THREE.BoxGeometry(CELL, 1, CELL);
const mat = new THREE.MeshStandardMaterial({roughness:0.94, metalness:0.0, flatShading:true, vertexColors:false});
const mesh = new THREE.InstancedMesh(geo, mat, N*N);
const dummy = new THREE.Object3D(), col = new THREE.Color();
const biomeCount = {water:0,shore:0,grass:0,forest:0,rock:0,snow:0};
function colorFor(h){
  const nh = (h-waterVox)/Math.max(1,(maxVox-waterVox));
  const j = (Math.random()-0.5)*0.06;
  if(h<=waterVox){ biomeCount.water++;  return col.setRGB(0.19,0.40,0.50); }
  if(nh<0.04){ biomeCount.shore++;  return col.setRGB(0.79+j,0.72+j,0.54+j); }
  if(nh<0.44){ biomeCount.grass++;  return col.setRGB(0.46+j,0.61+j,0.32+j); }
  if(nh<0.74){ biomeCount.forest++; return col.setRGB(0.27+j,0.45+j,0.25+j); }
  if(h<snowVox){ biomeCount.rock++; return col.setRGB(0.53+j,0.50+j,0.44+j); }
  biomeCount.snow++; return col.setRGB(0.95+j,0.95+j,0.92+j);
}
let peak={h:-1}, ridge={h:-1}, river=null, surface=null;
let idx=0;
for(let j=0;j<N;j++){ for(let i=0;i<N;i++){
  const h = Hv[j*N+i];
  // forest cells get a touch of extra bump for a clumpy canopy
  const nh=(h-waterVox)/Math.max(1,(maxVox-waterVox));
  let hh=h; if(nh>=0.44 && nh<0.74 && h<snowVox && Math.random()<0.5) hh += 1;
  dummy.position.set(i-half, hh*STEP/2, j-half);
  dummy.scale.set(CELL, Math.max(1,hh*STEP), CELL);
  dummy.updateMatrix();
  mesh.setMatrixAt(idx, dummy.matrix);
  mesh.setColorAt(idx, colorFor(h));
  // pick annotation anchors
  const wx=i-half, wz=j-half, wy=h*STEP;
  if(h>peak.h){ peak={h, x:wx,y:wy,z:wz}; }
  if(h<snowVox && h>ridge.h && Math.abs(wx)<half*0.5){ ridge={h, x:wx,y:wy,z:wz}; }
  if(!river && h<=waterVox && j>N*0.55 && Math.abs(wx)<half*0.4){ river={x:wx,y:waterVox*STEP,z:wz}; }
  if(!surface && nh>0.15 && nh<0.3 && j>N*0.4 && j<N*0.6){ surface={x:wx,y:wy,z:wz}; }
  idx++;
}}
mesh.instanceMatrix.needsUpdate=true; if(mesh.instanceColor) mesh.instanceColor.needsUpdate=true;
scene.add(mesh);
river   = river   || {x:0,y:waterVox*STEP,z:20};
surface = surface || {x:-10,y:8,z:0};

// dirt base band under the slab
const base = new THREE.Mesh(new THREE.BoxGeometry(N, 6, N), new THREE.MeshStandardMaterial({color:0x5b4a38, roughness:1, flatShading:true}));
base.position.set(0,-3,0); scene.add(base);
// soft contact shadow
const sh = new THREE.Mesh(new THREE.CircleGeometry(N*0.85, 48), new THREE.MeshBasicMaterial({color:0x000000, transparent:true, opacity:0.14}));
sh.rotation.x=-Math.PI/2; sh.position.y=-6.05; scene.add(sh);

/* ---------- water ---------- */
const water = new THREE.Mesh(new THREE.PlaneGeometry(N, N, 1,1),
  new THREE.MeshStandardMaterial({color:0x3f86ab, transparent:true, opacity:0.82, roughness:0.18, metalness:0.0}));
water.rotation.x=-Math.PI/2; water.position.y=waterVox*STEP - 0.15; scene.add(water);

/* ---------- clouds ---------- */
function cloudTex(){
  const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d');
  for(let n=0;n<9;n++){ const x=32+Math.random()*64, y=44+Math.random()*40, r=18+Math.random()*30;
    const rg=g.createRadialGradient(x,y,0,x,y,r); rg.addColorStop(0,'rgba(255,255,255,0.9)'); rg.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=rg; g.beginPath(); g.arc(x,y,r,0,7); g.fill(); }
  const t=new THREE.CanvasTexture(c); return t;
}
const CT=cloudTex(); const clouds=[];
for(let n=0;n<7;n++){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:CT, transparent:true, opacity:0.7, depthWrite:false}));
  const sc=34+Math.random()*40; s.scale.set(sc, sc*0.55, 1);
  s.position.set((Math.random()-0.5)*N*1.3, 20+Math.random()*16, (Math.random()-0.5)*N*1.3);
  s.userData.spd=0.6+Math.random()*0.8; scene.add(s); clouds.push(s); }

/* ---------- lights ---------- */
scene.add(new THREE.HemisphereLight(0xf5efe0, 0x5a5040, 1.0));
const sun=new THREE.DirectionalLight(0xfff2df, 1.15); sun.position.set(-46,72,34); scene.add(sun);
const fill=new THREE.DirectionalLight(0xcfe2ff, 0.35); fill.position.set(50,30,-40); scene.add(fill);

/* ---------- camera keyframes (scroll) ---------- */
const KF=[
  {r:158,h:96,ang:38, ty:6,  fov:40},
  {r:98, h:44,ang:22, ty:5,  fov:38},
  {r:82, h:30,ang:-12,ty:4,  fov:43},
  {r:132,h:70,ang:118,ty:7,  fov:40},
  {r:92, h:82,ang:198,ty:14, fov:36},
  {r:168,h:112,ang:252,ty:8, fov:40}
];
const sm=x=>x*x*(3-2*x);
function lerp(a,b,t){ return a+(b-a)*t; }
let scrollS=0;
function camState(s){
  const f=s*(KF.length-1); let i=Math.floor(f); if(i>=KF.length-1)i=KF.length-2; const t=sm(f-i);
  const A=KF[i],B=KF[i+1];
  return {r:lerp(A.r,B.r,t),h:lerp(A.h,B.h,t),ang:lerp(A.ang,B.ang,t),ty:lerp(A.ty,B.ty,t),fov:lerp(A.fov,B.fov,t)};
}

/* ---------- annotations + caption cards ---------- */
const CARDS=[
  {num:'01',k:'Terrain, cell by cell', d:'Every square of land is a stack of voxels — coloured by elevation, moisture and canopy.', anchor:surface, tag:'CANOPY · 620 M'},
  {num:'02',k:'Rivers that actually flow', d:'Channels are carved into the field, then water settles into them, just like a real watershed.', anchor:river, tag:'RIVER DELTA'},
  {num:'03',k:'Every ridge and valley', d:'Orbit the whole massif. Nothing here is a texture — it is all real, lit geometry.', anchor:ridge, tag:'RIDGE LINE · 1,240 M'},
  {num:'04',k:'Snow above the tree line', d:'Past a threshold the rock turns to snowpack — the same simple rule the planet uses.', anchor:peak, tag:'SNOW CAP · 2,050 M'}
];
const capEl=document.getElementById('cap'), capNum=document.getElementById('capNum'), capK=document.getElementById('capK'),
      capD=document.getElementById('capD'), capBar=document.getElementById('capBar'), hintEl=document.getElementById('hint');
const annoWrap=document.getElementById('anno');
const tagEls=CARDS.map(c=>{ const d=document.createElement('div'); d.className='tag'; d.textContent=c.tag; annoWrap.appendChild(d); return d; });
let activeCard=-1;
function setCard(i,frac){
  if(i!==activeCard){ activeCard=i;
    if(i>=0){ const c=CARDS[i]; capNum.textContent=c.num; capK.textContent=c.k; capD.textContent=c.d; capEl.classList.add('on'); }
    else capEl.classList.remove('on');
    tagEls.forEach((t,k)=>t.classList.toggle('on',k===i));
  }
  if(i>=0) capBar.style.width=Math.round(frac*100)+'%';
}

/* ---------- scroll ---------- */
function onScroll(){
  const max=Math.max(1, document.documentElement.scrollHeight - innerHeight);
  scrollS = Math.min(1, Math.max(0, scrollY/max));
  hintEl.style.opacity = scrollS>0.04 ? 0 : 1;
  // caption ranges
  const ranges=[[0.10,0.30],[0.30,0.50],[0.50,0.70],[0.70,0.90]];
  let set=false;
  for(let i=0;i<ranges.length;i++){ const [a,b]=ranges[i]; if(scrollS>=a && scrollS<b){ setCard(i,(scrollS-a)/(b-a)); set=true; break; } }
  if(!set) setCard(-1,0);
}
addEventListener('scroll', onScroll, {passive:true});

/* ---------- resize ---------- */
function resize(){ renderer.setSize(innerWidth, innerHeight); cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize(); onScroll();
try{ renderer.compile(scene, cam); }catch(e){ console.error('CONTOUR compile failed:', e); }

/* ---------- render loop ---------- */
const tmp=new THREE.Vector3();
function place(anchor, el){
  if(!anchor){ el.style.opacity=0; return; }
  tmp.set(anchor.x, anchor.y+2, anchor.z).project(cam);
  if(tmp.z>1){ el.classList.remove('on'); return; }
  el.style.left=((tmp.x*0.5+0.5)*innerWidth)+'px';
  el.style.top =((-tmp.y*0.5+0.5)*innerHeight)+'px';
}
let t0=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const t=(now-t0)/1000;
  const cs=camState(scrollS);
  const a=THREE.MathUtils.degToRad(cs.ang + t*2.2);   // gentle constant orbit
  cam.position.set(Math.cos(a)*cs.r, cs.h, Math.sin(a)*cs.r);
  cam.lookAt(0, cs.ty, 0);
  if(Math.abs(cam.fov-cs.fov)>0.01){ cam.fov=cs.fov; cam.updateProjectionMatrix(); }
  // clouds drift
  for(const s of clouds){ s.position.x += s.userData.spd*0.02; if(s.position.x>N*0.8) s.position.x=-N*0.8; }
  water.material.opacity = 0.78 + 0.06*Math.sin(t*0.8);
  // annotation follow
  tagEls.forEach((el,i)=>{ if(el.classList.contains('on')) place(CARDS[i].anchor, el); });
  renderer.render(scene, cam);
}
requestAnimationFrame(frame);

/* ---------- verify hook ---------- */
window.__contour = ()=>({
  three:THREE.REVISION, N, instances:mesh.count, maxVox, waterVox, snowVox,
  biome:biomeCount, clouds:clouds.length,
  camY:Math.round(cam.position.y), scrollS:+scrollS.toFixed(2),
  webgl: !!renderer.getContext(),
  peakY:peak.y, riverY:river&&river.y
});
})();
