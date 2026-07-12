/* HALO — a real Three.js network globe: dotted sphere + live arcs + traveling pulses + atmosphere. */
(function(){
const canvas=document.getElementById('gl');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.setClearColor(0x050810,1);
const scene=new THREE.Scene();
const cam=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,0.1,100);
cam.position.set(0,0,5.2);
const R=2, world=new THREE.Group();
world.position.x = innerWidth<720?0:0.7; world.rotation.x=0.32; scene.add(world);

/* dotted sphere */
function fib(n,r){ const a=[],off=2/n,inc=Math.PI*(3-Math.sqrt(5));
  for(let i=0;i<n;i++){ const y=i*off-1+off/2, rad=Math.sqrt(Math.max(0,1-y*y)), phi=i*inc; a.push(Math.cos(phi)*rad*r,y*r,Math.sin(phi)*rad*r);} return a; }
const NP=innerWidth<720?1200:2200;
const dots=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(fib(NP,R),3)),
  new THREE.PointsMaterial({color:0x2f5a8c,size:0.018,sizeAttenuation:true,transparent:true,opacity:0.9}));
world.add(dots);

/* atmosphere rim glow */
const atm=new THREE.Mesh(new THREE.SphereGeometry(R*1.16,48,48), new THREE.ShaderMaterial({
  uniforms:{c:{value:new THREE.Color(0x5fd0ff)}},
  vertexShader:'varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'varying vec3 vN; uniform vec3 c; void main(){ float i=pow(0.74-dot(vN,vec3(0.,0.,1.)),3.0); gl_FragColor=vec4(c,1.)*clamp(i,0.,1.);}',
  side:THREE.BackSide, blending:THREE.AdditiveBlending, transparent:true, depthWrite:false }));
world.add(atm);

/* markers */
function onSphere(lat,lon,r){ const p=(90-lat)*Math.PI/180, t=(lon+180)*Math.PI/180;
  return new THREE.Vector3(-r*Math.sin(p)*Math.cos(t), r*Math.cos(p), r*Math.sin(p)*Math.sin(t)); }
const CITIES=[[22,114],[35,139],[1,103],[25,55],[48,2],[51,0],[40,-74],[34,-118],[-33,151],[19,72],[-23,-46],[55,37],[1,36],[37,127],[13,100],[52,13]];
const mpos=CITIES.map(c=>onSphere(c[0],c[1],R*1.01));
world.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position',
  new THREE.Float32BufferAttribute(mpos.flatMap(v=>[v.x,v.y,v.z]),3)),
  new THREE.PointsMaterial({color:0x9fe8ff,size:0.07,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false})));

/* arcs + traveling pulses */
const ARCN=14, arcs=[];
const pulseGeo=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(ARCN*3),3));
const pulses=new THREE.Points(pulseGeo,new THREE.PointsMaterial({color:0x8ff0ff,size:0.11,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false}));
world.add(pulses);
function mkArc(){ let a=mpos[(Math.random()*mpos.length)|0], b=mpos[(Math.random()*mpos.length)|0]; if(a===b) b=mpos[(mpos.length-1)];
  const mid=a.clone().add(b).multiplyScalar(0.5); const lift=1+0.35*a.distanceTo(b)/R; mid.setLength(R*lift);
  const curve=new THREE.QuadraticBezierCurve3(a,mid,b);
  const g=new THREE.BufferGeometry().setFromPoints(curve.getPoints(56));
  const line=new THREE.Line(g,new THREE.LineBasicMaterial({color:0x5fd0ff,transparent:true,opacity:0.0,blending:THREE.AdditiveBlending,depthWrite:false}));
  world.add(line); return {curve,line,u:0,spd:0.004+Math.random()*0.006,phase:Math.random()}; }
for(let i=0;i<ARCN;i++) arcs.push(mkArc());

/* drag + auto-rotate (window-level; UI overlays the canvas) */
let yaw=0,pitch=0.32,vyaw=0,drag=false,lx=0,ly=0;
const isUI=t=>!!(t&&t.closest&&t.closest('a,button'));
addEventListener('pointerdown',e=>{ if(e.pointerType==='touch'||isUI(e.target))return; drag=true; lx=e.clientX; ly=e.clientY; canvas.classList.add('grab'); });
addEventListener('pointermove',e=>{ if(!drag)return; const dx=e.clientX-lx,dy=e.clientY-ly; lx=e.clientX; ly=e.clientY; yaw+=dx*0.006; vyaw=dx*0.006; pitch=Math.max(-1,Math.min(1,pitch+dy*0.004)); },{passive:true});
addEventListener('pointerup',()=>{ if(drag){drag=false;canvas.classList.remove('grab');} });

function resize(){ renderer.setSize(innerWidth,innerHeight); cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix(); world.position.x=innerWidth<720?0:0.7; }
addEventListener('resize',resize); resize();
try{ renderer.compile(scene,cam); }catch(e){ console.error('HALO compile',e); }

const tmp=new THREE.Vector3();
function frame(){ requestAnimationFrame(frame);
  if(!drag){ yaw+=0.0016+vyaw; vyaw*=0.94; }
  world.rotation.y=yaw; world.rotation.x=pitch;
  const pa=pulseGeo.attributes.position.array;
  for(let i=0;i<arcs.length;i++){ const a=arcs[i]; a.u+=a.spd; if(a.u>1){ a.u=0; const na=mkArc(); world.remove(a.line); a.line.geometry.dispose(); arcs[i]=na; }
    const el=arcs[i]; el.line.material.opacity=0.28*Math.sin(Math.min(1,el.u)*Math.PI);
    el.curve.getPointAt(Math.min(1,el.u),tmp); pa[i*3]=tmp.x; pa[i*3+1]=tmp.y; pa[i*3+2]=tmp.z; }
  pulseGeo.attributes.position.needsUpdate=true;
  renderer.render(scene,cam);
}
requestAnimationFrame(frame);
window.__halo=()=>({three:THREE.REVISION,dots:NP,markers:mpos.length,arcs:arcs.length,webgl:!!renderer.getContext(),camZ:cam.position.z});
})();
