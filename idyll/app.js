/* IDYLL — an INFINITE barrel-warp scroll gallery (matched to the @nn0r1nn1ch1 ref):
   idyllic image planes bow like a barrel and roll endlessly past on a blue field.
   Wheel/touch drive it forever in either direction; click any scene as it inclines
   past and it flies to centre, flattens, and enlarges. Three.js r128. */
(function(){
const canvas=document.getElementById('gl');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
const BLUE=new THREE.Color(0x1f4fd8); renderer.setClearColor(BLUE,1);
const scene=new THREE.Scene();
const cam=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,0.1,100); cam.position.z=6;

const IMGS =['b_hill','b_tulips','b_beach','b_dunes','b_peaks'];
const NAMES=['Hillside','Tulip Field','Shoreline','The Dunes','High Peaks'];
const SP=3.6, N=IMGS.length, TOTAL=N*SP;

const FRAG=`precision highp float; uniform sampler2D uTex; uniform vec3 uBlue; uniform float uHas; uniform float uDim; varying vec2 vUv;
void main(){ vec2 b=vUv-0.5; float r2=dot(b,b); b*=1.0-0.16*r2; b+=0.5;
  if(uHas<0.5 || b.x<0.0||b.x>1.0||b.y<0.0||b.y>1.0){ gl_FragColor=vec4(uBlue,1.0); return; }
  vec3 c=texture2D(uTex,b).rgb; float edge=smoothstep(0.0,0.02,min(min(b.x,1.0-b.x),min(b.y,1.0-b.y)));
  vec3 col=mix(uBlue,c,edge); col=mix(col,uBlue,uDim);            // uDim recedes non-focused scenes toward the blue field
  gl_FragColor=vec4(col,1.0); }`;

const planes=[]; const loader=new THREE.TextureLoader();
for(let i=0;i<N;i++){
  const mat=new THREE.ShaderMaterial({uniforms:{uTex:{value:null},uBlue:{value:BLUE},uHas:{value:0},uDim:{value:0}},
    vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader:FRAG});
  loader.load('img/'+IMGS[i]+'.jpg', t=>{ t.minFilter=THREE.LinearFilter; t.generateMipmaps=false; mat.uniforms.uTex.value=t; mat.uniforms.uHas.value=1; });
  const m=new THREE.Mesh(new THREE.PlaneGeometry(4.6,3.0), mat);
  m.userData={baseY:-i*SP, f:0, name:NAMES[i]}; planes.push(m); scene.add(m);
}

/* ---- infinite drive: wheel + touch accumulate an UNBOUNDED offset, never a page bottom ---- */
let scroll=0, tScroll=0, drift=0.006;
addEventListener('wheel',e=>{ if(focused) return; tScroll += e.deltaY*0.006; drift=0.006; },{passive:true});
let ty=0;
addEventListener('touchstart',e=>{ ty=e.touches[0].clientY; },{passive:true});
addEventListener('touchmove',e=>{ if(focused) return; const y=e.touches[0].clientY; tScroll += (ty-y)*0.014; ty=y; drift=0.006; },{passive:true});

/* ---- click-to-enlarge via raycast ---- */
const ray=new THREE.Raycaster(), ptr=new THREE.Vector2();
let focused=null, focusAmt=0;
function pick(cx,cy){ ptr.x=(cx/innerWidth)*2-1; ptr.y=-(cy/innerHeight)*2+1; ray.setFromCamera(ptr,cam);
  const hit=ray.intersectObjects(planes,false); return hit.length?hit[0].object:null; }
const body=document.body, cap=document.getElementById('cap'), hint=document.getElementById('hint');
function setFocus(m){ focused=m;
  if(m){ body.classList.add('focused'); cap.textContent=m.userData.name; hint.textContent='Click anywhere to close · Esc'; }
  else { body.classList.remove('focused'); hint.textContent='Scroll to drift · click a scene to enlarge'; } }
addEventListener('pointerdown',e=>{ const m=pick(e.clientX,e.clientY);
  if(focused){ setFocus(m && m!==focused ? m : null); }   // click another → switch, click same/empty → close
  else if(m){ setFocus(m); } });
addEventListener('keydown',e=>{ if(e.key==='Escape'&&focused) setFocus(null); });
addEventListener('pointermove',e=>{ if(focused){ canvas.style.cursor='pointer'; return; }
  canvas.style.cursor = pick(e.clientX,e.clientY)?'pointer':'default'; },{passive:true});

function resize(){ renderer.setSize(innerWidth,innerHeight); cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix(); }
addEventListener('resize',resize); resize();
try{ renderer.compile(scene,cam); }catch(e){}

const FZ=2.8;                                               // focus depth: fills the frame, flat, ~1.9x apparent size
function frame(){ requestAnimationFrame(frame);
  focusAmt += ((focused?1:0)-focusAmt)*0.12;
  if(!focused){ scroll += (tScroll-scroll)*0.08 + drift; }  // freeze the drift while a scene is enlarged
  planes.forEach(m=>{
    let hy=m.userData.baseY + scroll; hy=((hy%TOTAL)+TOTAL)%TOTAL; if(hy>TOTAL/2) hy-=TOTAL;   // wrap → infinite
    const homeZ=-Math.abs(hy)*0.14, homeRot=-hy*0.16, homeS=1.0-Math.min(0.18,Math.abs(hy)*0.03);
    const isF=(m===focused);
    m.userData.f += ((isF?1:0)-m.userData.f)*0.12; const f=m.userData.f;
    m.position.x=0;
    m.position.y=hy*(1-f);
    m.position.z=homeZ*(1-f)+FZ*f;
    m.rotation.x=homeRot*(1-f);
    m.scale.setScalar(homeS*(1-f)+1.0*f);
    m.renderOrder = f>0.01?1:0;
    m.material.uniforms.uDim.value = isF?0 : focusAmt*0.7;  // others recede into the blue
  });
  renderer.render(scene,cam);
}
requestAnimationFrame(frame);
window.__idyll=()=>({three:THREE.REVISION,planes:planes.length,loaded:planes.filter(p=>p.material.uniforms.uHas.value).length,
  focused:focused?focused.userData.name:null,focusAmt:+focusAmt.toFixed(2),webgl:!!renderer.getContext()});
})();
