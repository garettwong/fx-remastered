/* HALO — realistic Earth globe + orbiting arc rings + floating icons connected by lines
   (matched to the @LineCode_LC reference: blue Earth, connection icons, blue horizon). Three.js r128. */
(function(){
const canvas=document.getElementById('gl');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.setClearColor(0x05070e,1);
const scene=new THREE.Scene();
const cam=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,0.1,100); cam.position.set(0,0,6);
const world=new THREE.Group(); world.position.x=innerWidth<720?0:0.7; scene.add(world);
const R=1.7;

/* ---- value noise for continents ---- */
function hash(x,y){ let h=(x|0)*374761393+(y|0)*668265263; h=(h^(h>>13))*1274126177; return ((h^(h>>16))>>>0)/4294967295; }
function vn(x,y){ const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash(xi,yi),b=hash(xi+1,yi),c=hash(xi,yi+1),d=hash(xi+1,yi+1); return a*(1-u)*(1-v)+b*u*(1-v)+c*(1-u)*v+d*u*v; }
function fbm(x,y){ let s=0,a=.5,f=1; for(let i=0;i<5;i++){ s+=a*vn(x*f,y*f); f*=2; a*=.5; } return s; }
function earthTex(){ const w=1024,h=512,c=document.createElement('canvas'); c.width=w;c.height=h; const g=c.getContext('2d');
  const og=g.createLinearGradient(0,0,0,h); og.addColorStop(0,'#123a66'); og.addColorStop(.5,'#1c5290'); og.addColorStop(1,'#123a66');
  g.fillStyle=og; g.fillRect(0,0,w,h);
  const img=g.getImageData(0,0,w,h), d=img.data;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){ const nx=x/w, ny=y/h;
    let n=fbm(nx*7+2,ny*7)*0.68 + fbm(nx*3+9,ny*3)*0.42; n -= Math.abs(ny-0.5)*0.25;
    if(n>0.6){ const i=(y*w+x)*4; const hi=n>0.72; const L=hi?[126,138,102]:[98,116,84];
      d[i]=L[0]; d[i+1]=L[1]; d[i+2]=L[2]; } }
  g.putImageData(img,0,0);
  g.fillStyle='rgba(232,240,248,0.9)'; g.fillRect(0,0,w,h*0.05); g.fillRect(0,h*0.95,w,h*0.05);
  const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t; }

/* ---- earth ---- */
const earth=new THREE.Mesh(new THREE.SphereGeometry(R,64,64), new THREE.MeshStandardMaterial({map:earthTex(),roughness:0.85,metalness:0.05}));
world.add(earth);
/* atmosphere */
const atm=new THREE.Mesh(new THREE.SphereGeometry(R*1.14,48,48), new THREE.ShaderMaterial({
  uniforms:{c:{value:new THREE.Color(0x5aa8ff)}},
  vertexShader:'varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'varying vec3 vN; uniform vec3 c; void main(){ float i=pow(0.72-dot(vN,vec3(0.,0.,1.)),2.6); gl_FragColor=vec4(c,1.)*clamp(i,0.,1.);}',
  side:THREE.BackSide, blending:THREE.AdditiveBlending, transparent:true, depthWrite:false }));
world.add(atm);

/* ---- orbit arc rings ---- */
const rings=[];
[[0.35,0.1,0x7fc0ff],[ -0.5,0.6,0xa9e0ff],[0.2,-0.7,0x6fb0ff]].forEach((r,i)=>{
  const m=new THREE.Mesh(new THREE.TorusGeometry(R*(1.35+i*0.16),0.006,3,120),
    new THREE.MeshBasicMaterial({color:r[2],transparent:true,opacity:0.5,blending:THREE.AdditiveBlending}));
  m.rotation.x=r[0]; m.rotation.y=r[1]; world.add(m); rings.push(m); });

/* ---- floating icons + connection lines ---- */
const ICONS=['📅','📁','💼','📊','💬','⭐','🪙','🌐'];
function emojiTex(e){ const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d');
  g.font='92px serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(e,64,72); return new THREE.CanvasTexture(c); }
const NI=innerWidth<720?6:8;
for(let i=0;i<NI;i++){ const a=(i/NI)*6.2831+0.3, tilt=(Math.random()-0.5)*1.2, rr=R*2.05;
  const pos=new THREE.Vector3(Math.cos(a)*rr, Math.sin(tilt)*rr*0.7, Math.sin(a)*rr*0.7);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex(ICONS[i%ICONS.length]),transparent:true,depthWrite:false}));
  sp.position.copy(pos); sp.scale.setScalar(0.42); sp.userData={ph:Math.random()*6.28, base:pos.clone()}; world.add(sp);
  const surf=pos.clone().setLength(R*1.02);
  const g=new THREE.BufferGeometry().setFromPoints([surf,pos]);
  world.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:0x6fb8ff,transparent:true,opacity:0.4,blending:THREE.AdditiveBlending})));
}

/* ---- lights ---- */
scene.add(new THREE.HemisphereLight(0xcfe4ff,0x0a1424,0.7));
const sun=new THREE.DirectionalLight(0xffffff,1.5); sun.position.set(4,2,5); scene.add(sun);

/* ---- drag + auto-rotate ---- */
let yaw=0,pitch=0.2,vyaw=0,drag=false,lx=0,ly=0;
const isUI=t=>!!(t&&t.closest&&t.closest('a,button'));
addEventListener('pointerdown',e=>{ if(e.pointerType==='touch'||isUI(e.target))return; drag=true; lx=e.clientX; ly=e.clientY; canvas.classList.add('grab'); });
addEventListener('pointermove',e=>{ if(!drag)return; const dx=e.clientX-lx,dy=e.clientY-ly; lx=e.clientX; ly=e.clientY; yaw+=dx*0.006; vyaw=dx*0.006; pitch=Math.max(-0.9,Math.min(0.9,pitch+dy*0.004)); },{passive:true});
addEventListener('pointerup',()=>{ if(drag){drag=false;canvas.classList.remove('grab');} });
function resize(){ renderer.setSize(innerWidth,innerHeight); cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix(); world.position.x=innerWidth<720?0:0.7; }
addEventListener('resize',resize); resize();

let t=0;
function frame(){ requestAnimationFrame(frame); t+=0.016;
  if(!drag){ yaw+=0.0016+vyaw; vyaw*=0.94; }
  world.rotation.y=yaw; world.rotation.x=pitch;
  earth.rotation.y += 0.0011;                       // earth spins within the world
  rings.forEach((m,i)=>{ m.rotation.z += 0.0016*(i+1); });
  world.children.forEach(o=>{ if(o.isSprite){ o.position.copy(o.userData.base).multiplyScalar(1+0.02*Math.sin(t+o.userData.ph)); } });
  renderer.render(scene,cam);
}
requestAnimationFrame(frame);
window.__halo=()=>({three:THREE.REVISION,icons:NI,rings:rings.length,hasEarth:!!earth,webgl:!!renderer.getContext()});
})();
