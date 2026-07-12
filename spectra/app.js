/* SPECTRA — a real wide-gamut mesh gradient: 6 colour points blended by inverse-distance,
   drifting on their own, draggable. Three.js r128 fullscreen fragment shader. */
(function(){
const canvas=document.getElementById('gl');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
const scene=new THREE.Scene(), cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const NP=6;
const COLS=[[0.12,0.55,0.30],[1.0,0.23,0.34],[0.23,0.42,1.0],[1.0,0.44,0.70],[0.55,0.23,1.0],[0.18,0.84,0.84]];
const U={ uRes:{value:new THREE.Vector2(1,1)}, uTime:{value:0},
  uPts:{value:COLS.map((_,i)=>new THREE.Vector2(0.5+0.32*Math.cos(i/NP*6.283), 0.5+0.32*Math.sin(i/NP*6.283)))},
  uCols:{value:COLS.map(c=>new THREE.Vector3(c[0],c[1],c[2]))} };
const FRAG=`
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uPts[6]; uniform vec3 uCols[6];
void main(){
  vec2 uv=gl_FragCoord.xy/uRes; float asp=uRes.x/uRes.y; vec2 st=uv; st.x*=asp;
  vec3 col=vec3(0.0); float wsum=0.0;
  for(int i=0;i<6;i++){ vec2 p=uPts[i]; p.x*=asp; float d=distance(st,p); float w=1.0/(pow(d,2.3)+0.0007); col+=uCols[i]*w; wsum+=w; }
  col/=wsum;
  col=pow(clamp(col,0.0,1.0),vec3(0.92));
  col+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.545)-0.5)*0.018;
  gl_FragColor=vec4(col,1.0);
}`;
const mat=new THREE.ShaderMaterial({uniforms:U,fragmentShader:FRAG,vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}'});
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat));
function resize(){ renderer.setSize(innerWidth,innerHeight); U.uRes.value.set(innerWidth,innerHeight); }
addEventListener('resize',resize); resize();

/* DOM drag dots */
const dotsEl=document.getElementById('dots');
const dots=COLS.map((c,i)=>{ const d=document.createElement('div'); d.className='dot';
  d.style.background='rgb('+(c[0]*255|0)+','+(c[1]*255|0)+','+(c[2]*255|0)+')'; dotsEl.appendChild(d); return d; });
const home=U.uPts.value.map(v=>v.clone());   // drift anchors
let dragI=-1;
dots.forEach((d,i)=>d.addEventListener('pointerdown',e=>{ dragI=i; d.setPointerCapture(e.pointerId); e.preventDefault(); }));
addEventListener('pointermove',e=>{ if(dragI<0)return; const x=e.clientX/innerWidth, y=1-e.clientY/innerHeight;
  U.uPts.value[dragI].set(Math.max(0,Math.min(1,x)),Math.max(0,Math.min(1,y))); home[dragI].copy(U.uPts.value[dragI]); },{passive:false});
addEventListener('pointerup',()=>dragI=-1);

let t=0;
function frame(){ requestAnimationFrame(frame); t+=0.006; U.uTime.value=t;
  for(let i=0;i<NP;i++){ if(i===dragI) continue;
    const h=home[i]; const px=h.x+Math.sin(t*0.5+i*1.3)*0.05, py=h.y+Math.cos(t*0.4+i*2.1)*0.05;
    U.uPts.value[i].set(px,py); }
  // sync dots to points
  for(let i=0;i<NP;i++){ const p=U.uPts.value[i]; dots[i].style.left=(p.x*innerWidth)+'px'; dots[i].style.top=((1-p.y)*innerHeight)+'px'; }
  renderer.render(scene,cam);
}
requestAnimationFrame(frame);
window.__spectra=()=>({three:THREE.REVISION,points:NP,dots:dots.length,webgl:!!renderer.getContext(),res:[U.uRes.value.x,U.uRes.value.y]});
})();
