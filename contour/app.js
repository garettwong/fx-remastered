/* CONTOUR — a real Three.js voxel-terrain digital twin.
   Procedural heightfield -> carved rivers -> biome InstancedMesh slab, inside an
   invisible clipping box you can DRAG to orbit; ~14 labels pinned to the terrain;
   scroll drives a camera flythrough + caption cards. */
(function(){
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1, 1.75));
renderer.localClippingEnabled = true;
const PAPER = 0xece6da;
const scene = new THREE.Scene();
scene.background = new THREE.Color(PAPER);
scene.fog = new THREE.Fog(PAPER, 240, 560);
const cam = new THREE.PerspectiveCamera(40, innerWidth/innerHeight, 1, 1200);

/* ---------- value noise / fbm ---------- */
function hash(x,y){ let h=(x|0)*374761393 + (y|0)*668265263; h=(h^(h>>13))*1274126177; return ((h^(h>>16))>>>0)/4294967295; }
function vnoise(x,y){ const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;
  const u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  const a=hash(xi,yi),b=hash(xi+1,yi),c=hash(xi,yi+1),d=hash(xi+1,yi+1);
  return a*(1-u)*(1-v)+b*u*(1-v)+c*(1-u)*v+d*u*v; }
function fbm(x,y,oct){ let s=0,a=0.5,f=1,n=0; for(let i=0;i<(oct||5);i++){ s+=a*vnoise(x*f,y*f); n+=a; f*=2; a*=0.5; } return s/n; }

/* ---------- terrain generation ---------- */
const N = innerWidth<720 ? 132 : 180;      // terrain is larger than the box, so panning reveals hidden land
const CELL=1, STEP=1, LEVELS=30, waterFrac=0.18, snowStart=0.88;
const half=N/2, clipHalf = innerWidth<720 ? 52 : 68;
function riverX(nz){ return 0.52 + 0.15*Math.sin(nz*6.2831*1.15+0.6) + 0.07*Math.sin(nz*6.2831*2.7+1.9); }
function riverX2(nz){ return 0.30 + 0.10*Math.sin(nz*6.2831*1.6+2.2); }

const E=new Float32Array(N*N); let emin=1e9,emax=-1e9;
for(let j=0;j<N;j++){ for(let i=0;i<N;i++){
  const nx=i/N, nz=j/N;
  let e = 0.55*fbm(nx*3.0+11, nz*3.0+7, 5) + 0.35*fbm(nx*1.3+40, nz*1.3+21, 4);
  e += 0.20*(nz*0.7 + 0.3);
  e += 0.13*Math.pow(fbm(nx*0.8+70, nz*0.8+61, 3), 1.6);
  let carve = Math.max(0, 1 - Math.abs(nx-riverX(nz))/0.055);
  if(nz>0.32 && nz<0.9){ carve = Math.max(carve, (1-Math.abs(nx-riverX2(nz))/0.045) * Math.min(1,(nz-0.32)/0.4)); }
  carve = Math.min(1, carve);
  e = e*(1-0.92*carve) - 0.10*carve;
  E[j*N+i]=e; if(e<emin)emin=e; if(e>emax)emax=e;
}}
const inv=1/(emax-emin);
const Hv=new Int16Array(N*N); let maxVox=1;
for(let k=0;k<N*N;k++){ let nh=(E[k]-emin)*inv; nh=Math.pow(nh,1.45); const h=1+Math.round(nh*(LEVELS-1)); Hv[k]=h; if(h>maxVox)maxVox=h; }
const waterVox = 1 + Math.round(waterFrac*(LEVELS-1));
const snowVox  = waterVox + Math.round(snowStart*(maxVox-waterVox));

/* ---------- clipping box (the invisible vitrine) ---------- */
const clip = [
  new THREE.Plane(new THREE.Vector3(-1,0,0), clipHalf),
  new THREE.Plane(new THREE.Vector3( 1,0,0), clipHalf),
  new THREE.Plane(new THREE.Vector3(0,0,-1), clipHalf),
  new THREE.Plane(new THREE.Vector3(0,0, 1), clipHalf)
];
const world = new THREE.Group(); scene.add(world);

/* ---------- voxel slab ---------- */
const geo = new THREE.BoxGeometry(CELL,1,CELL);
const mat = new THREE.MeshStandardMaterial({roughness:0.94, metalness:0.0, flatShading:true, clippingPlanes:clip});
const mesh = new THREE.InstancedMesh(geo, mat, N*N);
const dummy=new THREE.Object3D(), col=new THREE.Color();
const biomeCount={water:0,shore:0,grass:0,forest:0,rock:0,snow:0};
function colorFor(h){
  const nh=(h-waterVox)/Math.max(1,(maxVox-waterVox)); const j=(Math.random()-0.5)*0.06;
  if(h<=waterVox){ biomeCount.water++;  return col.setRGB(0.19,0.40,0.50); }
  if(nh<0.04){ biomeCount.shore++;  return col.setRGB(0.79+j,0.72+j,0.54+j); }
  if(nh<0.44){ biomeCount.grass++;  return col.setRGB(0.46+j,0.61+j,0.32+j); }
  if(nh<0.74){ biomeCount.forest++;
    if(Math.random()<0.05) return col.setRGB(0.70,0.42,0.18);   // autumn pop
    return col.setRGB(0.27+j,0.45+j,0.25+j); }
  if(h<snowVox){ biomeCount.rock++; return col.setRGB(0.53+j,0.50+j,0.44+j); }
  biomeCount.snow++; return col.setRGB(0.95+j,0.95+j,0.92+j);
}
let peak={h:-1};
let idx=0;
for(let j=0;j<N;j++){ for(let i=0;i<N;i++){
  const h=Hv[j*N+i]; const nh=(h-waterVox)/Math.max(1,(maxVox-waterVox));
  let hh=h; if(nh>=0.44 && nh<0.74 && h<snowVox && Math.random()<0.5) hh+=1;
  dummy.position.set(i-half, hh*STEP/2, j-half);
  dummy.scale.set(CELL, Math.max(1,hh*STEP), CELL);
  dummy.updateMatrix(); mesh.setMatrixAt(idx, dummy.matrix); mesh.setColorAt(idx, colorFor(h));
  if(h>peak.h) peak={h,x:i-half,y:h*STEP,z:j-half};
  idx++;
}}
mesh.instanceMatrix.needsUpdate=true; if(mesh.instanceColor) mesh.instanceColor.needsUpdate=true;
world.add(mesh);

// dirt base + contact shadow (also clipped)
const base=new THREE.Mesh(new THREE.BoxGeometry(N,6,N), new THREE.MeshStandardMaterial({color:0x5b4a38, roughness:1, flatShading:true, clippingPlanes:clip}));
base.position.y=-3; world.add(base);
const sh=new THREE.Mesh(new THREE.CircleGeometry(N*0.8,48), new THREE.MeshBasicMaterial({color:0x000000, transparent:true, opacity:0.13, clippingPlanes:clip}));
sh.rotation.x=-Math.PI/2; sh.position.y=-6.05; world.add(sh);

/* ---------- water ---------- */
const water=new THREE.Mesh(new THREE.PlaneGeometry(N,N,1,1),
  new THREE.MeshStandardMaterial({color:0x3f86ab, transparent:true, opacity:0.82, roughness:0.16, metalness:0.0, clippingPlanes:clip}));
water.rotation.x=-Math.PI/2; water.position.y=waterVox*STEP-0.15; world.add(water);

/* ---------- visible wireframe box (world-fixed vitrine) ---------- */
const boxH = maxVox+16;
const edges=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(clipHalf*2, boxH, clipHalf*2)),
  new THREE.LineBasicMaterial({color:0x2a2d2f, transparent:true, opacity:0.15}));
edges.position.y = -6 + boxH/2; scene.add(edges);

/* ---------- clouds (unclipped, drift) ---------- */
function cloudTex(){ const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d');
  for(let n=0;n<9;n++){ const x=32+Math.random()*64,y=44+Math.random()*40,r=18+Math.random()*30;
    const rg=g.createRadialGradient(x,y,0,x,y,r); rg.addColorStop(0,'rgba(255,255,255,0.9)'); rg.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=rg; g.beginPath(); g.arc(x,y,r,0,7); g.fill(); }
  return new THREE.CanvasTexture(c); }
const CT=cloudTex(); const clouds=[];
for(let n=0;n<6;n++){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:CT, transparent:true, opacity:0.66, depthWrite:false}));
  const sc=32+Math.random()*38; s.scale.set(sc, sc*0.55, 1);
  s.position.set((Math.random()-0.5)*N*1.1, 18+Math.random()*14, (Math.random()-0.5)*N*1.1);
  s.userData.spd=0.5+Math.random()*0.7; scene.add(s); clouds.push(s); }

/* ---------- lights ---------- */
scene.add(new THREE.HemisphereLight(0xf5efe0, 0x5a5040, 1.0));
const sun=new THREE.DirectionalLight(0xfff2df,1.15); sun.position.set(-46,72,34); scene.add(sun);
const fill=new THREE.DirectionalLight(0xcfe2ff,0.35); fill.position.set(50,30,-40); scene.add(fill);

/* ---------- terrain labels (pinned, tracking) ---------- */
const annoWrap=document.getElementById('anno');
function nearWater(i,j){ for(let dj=-3;dj<=3;dj++)for(let di=-3;di<=3;di++){ const ii=i+di,jj=j+dj; if(ii>=0&&ii<N&&jj>=0&&jj<N&&Hv[jj*N+ii]<=waterVox)return true; } return false; }
const TAGS=[]; const GX=5,GZ=4;
for(let gj=0; gj<GZ; gj++){ for(let gi=0; gi<GX; gi++){
  let i=Math.round((gi+0.5)/GX*N + (Math.random()-0.5)*N*0.09);
  let j=Math.round((gj+0.5)/GZ*N + (Math.random()-0.5)*N*0.09);
  i=Math.max(3,Math.min(N-4,i)); j=Math.max(3,Math.min(N-4,j));
  const h=Hv[j*N+i]; if(h<=waterVox) continue;
  const rel=(h-waterVox)/Math.max(1,(maxVox-waterVox)); const m=Math.round(h*68+60);
  let t; if(nearWater(i,j)) t=((i+j)%2)?'WETLAND':'RIPARIAN ZONE';
  else if(h>=snowVox) t='SNOWPACK'; else if(rel>0.74) t='RIDGE LINE';
  else if(rel>0.44) t='RIPARIAN ZONE'; else t='MEADOW';
  TAGS.push({x:i-half, y:h*STEP, z:j-half, t, m,
    sub:(40+((i*7+j*13)%12))+'.'+((i*3+j)%9)+'°N · '+(700+((i+j)%400))+' kg/m²'});
}}
const tagEls=TAGS.map(a=>{ const d=document.createElement('div'); d.className='t3';
  d.innerHTML='<b>'+a.t+' · '+a.m+' M</b><s>'+a.sub+'</s>'; annoWrap.appendChild(d); return d; });

/* ---------- caption cards (scroll narrative) ---------- */
const CARDS=[
  {num:'01',k:'Terrain, cell by cell', d:'Every square of land is a stack of voxels — coloured by elevation, moisture and canopy.'},
  {num:'02',k:'Rivers that actually flow', d:'Channels are carved into the field, then water settles into them, just like a real watershed.'},
  {num:'03',k:'Every ridge and valley', d:'Grab it and turn it. Nothing here is a texture — it is all real, lit geometry.'},
  {num:'04',k:'Snow above the tree line', d:'Past a threshold the rock turns to snowpack — the same simple rule the planet uses.'}
];
const capEl=document.getElementById('cap'),capNum=document.getElementById('capNum'),capK=document.getElementById('capK'),
      capD=document.getElementById('capD'),capBar=document.getElementById('capBar'),hintEl=document.getElementById('mhint');
let activeCard=-1;
function setCard(i,frac){
  if(i!==activeCard){ activeCard=i;
    if(i>=0){ const c=CARDS[i]; capNum.textContent=c.num; capK.textContent=c.k; capD.textContent=c.d; capEl.classList.add('on'); }
    else capEl.classList.remove('on'); }
  if(i>=0) capBar.style.width=Math.round(frac*100)+'%';
}

/* ---------- camera (fixed azimuth) + scroll ---------- */
const KF=[{r:172,h:104,ty:6,fov:40},{r:120,h:58,ty:5,fov:38},{r:94,h:40,ty:4,fov:44},
          {r:134,h:74,ty:7,fov:40},{r:106,h:96,ty:13,fov:36},{r:182,h:122,ty:8,fov:40}];
const AZ=0.34, sm=x=>x*x*(3-2*x), lerp=(a,b,t)=>a+(b-a)*t;
let scrollS=0;
function camState(s){ const f=s*(KF.length-1); let i=Math.floor(f); if(i>=KF.length-1)i=KF.length-2; const t=sm(f-i);
  const A=KF[i],B=KF[i+1]; return {r:lerp(A.r,B.r,t),h:lerp(A.h,B.h,t),ty:lerp(A.ty,B.ty,t),fov:lerp(A.fov,B.fov,t)}; }
function onScroll(){
  const max=Math.max(1, document.documentElement.scrollHeight-innerHeight);
  scrollS=Math.min(1,Math.max(0, scrollY/max));
  if(hintEl) hintEl.style.opacity = scrollS>0.04 ? 0 : 1;
  const ranges=[[0.10,0.30],[0.30,0.50],[0.50,0.70],[0.70,0.90]]; let set=false;
  for(let i=0;i<ranges.length;i++){ const[a,b]=ranges[i]; if(scrollS>=a&&scrollS<b){ setCard(i,(scrollS-a)/(b-a)); set=true; break; } }
  if(!set) setCard(-1,0);
}
addEventListener('scroll', onScroll, {passive:true});

/* ---------- drag: orbit (drag) + move/pan (right-drag or shift-drag).
   Listen on WINDOW, not the canvas — the overlay text/sections sit above the canvas and would swallow the drag. ---------- */
let yaw=0, pitch=0.02, yawVel=0, dragging=false, mode='rotate', lastX=0, lastY=0, curR=172;
const IDLE=0.055, clampP=v=>Math.max(-0.22,Math.min(0.58,v));
const pan=new THREE.Vector3(), panMax=(half-clipHalf)*0.9, clampPan=v=>Math.max(-panMax,Math.min(panMax,v));
const _r=new THREE.Vector3(), _u=new THREE.Vector3();
const isUI = t => !!(t && t.closest && t.closest('a,button'));
const body = document.body;
addEventListener('contextmenu', e=>{ if(!isUI(e.target)) e.preventDefault(); });
addEventListener('pointerdown', e=>{ if(e.pointerType==='touch' || isUI(e.target)) return;
  dragging=true; mode=(e.button===2||e.shiftKey)?'pan':'rotate'; lastX=e.clientX; lastY=e.clientY;
  body.classList.remove('grabbing','panning'); body.classList.add(mode==='pan'?'panning':'grabbing'); body.style.userSelect='none';
});
addEventListener('pointermove', e=>{ if(!dragging) return; const dx=e.clientX-lastX, dy=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY;
  if(mode==='pan'){                                   // slide the whole diorama in the ground plane; the box clips it
    _r.setFromMatrixColumn(cam.matrixWorld,0); _r.y=0; _r.normalize();
    _u.setFromMatrixColumn(cam.matrixWorld,1); _u.y=0; _u.normalize();
    const s=curR*0.0016; pan.addScaledVector(_r, dx*s); pan.addScaledVector(_u, -dy*s);
    pan.x=clampPan(pan.x); pan.z=clampPan(pan.z); pan.y=0;
  } else { yaw+=dx*0.007; yawVel=dx*0.007; pitch=clampP(pitch+dy*0.004); }
});
addEventListener('pointerup', ()=>{ if(dragging){ dragging=false; body.classList.remove('grabbing','panning'); body.style.userSelect=''; } });
addEventListener('dblclick', e=>{ if(!isUI(e.target)) pan.set(0,0,0); });   // double-click recentres the land

/* ---------- resize / compile ---------- */
function resize(){ renderer.setSize(innerWidth,innerHeight); cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize(); onScroll();
try{ renderer.compile(scene,cam); }catch(e){ console.error('CONTOUR compile failed:', e); }

/* ---------- render loop ---------- */
const tmp=new THREE.Vector3();
let t0=performance.now(), curFov=40;
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(0.05,(now-t0)/1000); t0=now; const t=now/1000;
  // orbit the diorama
  if(!dragging){ yaw += IDLE*dt + yawVel; yawVel*=0.92; }
  world.rotation.set(pitch, yaw, 0); world.position.copy(pan); world.updateMatrixWorld();
  // camera dolly by scroll
  const cs=camState(scrollS); curR=cs.r;
  cam.position.set(Math.sin(AZ)*cs.r, cs.h, Math.cos(AZ)*cs.r); cam.lookAt(0, cs.ty, 0);
  if(Math.abs(curFov-cs.fov)>0.01){ curFov=cs.fov; cam.fov=cs.fov; cam.updateProjectionMatrix(); }
  // clouds + water
  for(const s of clouds){ s.position.x += s.userData.spd*0.02; if(s.position.x>N*0.7) s.position.x=-N*0.7; }
  water.material.opacity = 0.78 + 0.06*Math.sin(t*0.8);
  // pinned labels: project, chop at the box, fade near the edge
  const wm=world.matrixWorld;
  for(let k=0;k<TAGS.length;k++){ const a=TAGS[k], el=tagEls[k];
    tmp.set(a.x, a.y+1.5, a.z).applyMatrix4(wm);
    const ex=Math.max(Math.abs(tmp.x), Math.abs(tmp.z));
    if(ex>clipHalf){ el.style.opacity=0; continue; }
    const pv=tmp.clone().project(cam);
    if(pv.z>1 || pv.x<-1.04||pv.x>1.04||pv.y<-1.04||pv.y>1.04){ el.style.opacity=0; continue; }
    el.style.left=((pv.x*0.5+0.5)*innerWidth)+'px';
    el.style.top =((-pv.y*0.5+0.5)*innerHeight)+'px';
    const fade=Math.max(0, Math.min(1, (clipHalf-ex)/(clipHalf*0.14)));
    el.style.opacity=(0.92*fade).toFixed(2);
  }
  renderer.render(scene, cam);
}
requestAnimationFrame(frame);

/* ---------- verify hooks ---------- */
window.__labelsNow = function(testYaw){
  if(testYaw!=null) yaw=testYaw;
  world.rotation.set(pitch,yaw,0); world.position.copy(pan); world.updateMatrixWorld();
  const cs=camState(scrollS); cam.position.set(Math.sin(AZ)*cs.r, cs.h, Math.cos(AZ)*cs.r); cam.lookAt(0,cs.ty,0); cam.updateMatrixWorld();
  const wm=world.matrixWorld; let vis=0, chopped=0; const sample=[];
  for(let k=0;k<TAGS.length;k++){ const a=TAGS[k], el=tagEls[k];
    tmp.set(a.x,a.y+1.5,a.z).applyMatrix4(wm);
    const ex=Math.max(Math.abs(tmp.x),Math.abs(tmp.z));
    if(ex>clipHalf){ el.style.opacity=0; chopped++; continue; }
    const pv=tmp.clone().project(cam);
    if(pv.z>1||pv.x<-1.04||pv.x>1.04||pv.y<-1.04||pv.y>1.04){ el.style.opacity=0; continue; }
    el.style.left=((pv.x*0.5+0.5)*innerWidth)+'px'; el.style.top=((-pv.y*0.5+0.5)*innerHeight)+'px';
    const fade=Math.max(0,Math.min(1,(clipHalf-ex)/(clipHalf*0.14))); el.style.opacity=(0.92*fade).toFixed(2); vis++;
    if(sample.length<3) sample.push({t:a.t, x:Math.round((pv.x*0.5+0.5)*innerWidth), y:Math.round((-pv.y*0.5+0.5)*innerHeight)});
  }
  return {visible:vis, chopped, sample};
};
window.__contour = ()=>({
  three:THREE.REVISION, N, instances:mesh.count, tags:TAGS.length, clipHalf:Math.round(clipHalf),
  maxVox, waterVox, snowVox, biome:biomeCount, clouds:clouds.length,
  clipping:renderer.localClippingEnabled, yaw:+yaw.toFixed(2),
  pan:{x:+pan.x.toFixed(1), z:+pan.z.toFixed(1)}, panMax:+panMax.toFixed(1), webgl:!!renderer.getContext()
});
})();
