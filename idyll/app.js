/* IDYLL — a barrel-warp scroll gallery (matched to the @nn0r1nn1ch1 ref): idyllic image
   planes that bow like a barrel and roll past on a blue field. Three.js r128. */
(function(){
const canvas=document.getElementById('gl');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
const BLUE=new THREE.Color(0x1f4fd8); renderer.setClearColor(BLUE,1);
const scene=new THREE.Scene();
const cam=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,0.1,100); cam.position.z=6;
const IMGS=['b_hill','b_tulips','b_beach','b_dunes','b_peaks'];
const SP=3.6, N=IMGS.length, TOTAL=N*SP;
const FRAG=`precision highp float; uniform sampler2D uTex; uniform vec3 uBlue; uniform float uHas; varying vec2 vUv;
void main(){ vec2 b=vUv-0.5; float r2=dot(b,b); b*=1.0-0.16*r2; b+=0.5;
  if(uHas<0.5 || b.x<0.0||b.x>1.0||b.y<0.0||b.y>1.0){ gl_FragColor=vec4(uBlue,1.0); return; }
  vec3 c=texture2D(uTex,b).rgb; float edge=smoothstep(0.0,0.02,min(min(b.x,1.0-b.x),min(b.y,1.0-b.y)));
  gl_FragColor=vec4(mix(uBlue,c,edge),1.0); }`;
const planes=[]; const loader=new THREE.TextureLoader();
for(let i=0;i<N;i++){
  const mat=new THREE.ShaderMaterial({uniforms:{uTex:{value:null},uBlue:{value:BLUE},uHas:{value:0}},
    vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader:FRAG});
  loader.load('img/'+IMGS[i]+'.jpg', t=>{ t.minFilter=THREE.LinearFilter; t.generateMipmaps=false; mat.uniforms.uTex.value=t; mat.uniforms.uHas.value=1; });
  const m=new THREE.Mesh(new THREE.PlaneGeometry(4.6,3.0), mat); m.userData.baseY=-i*SP; planes.push(m); scene.add(m);
}
let scroll=0, tScroll=0;
addEventListener('scroll',()=>{ const max=Math.max(1,document.documentElement.scrollHeight-innerHeight); tScroll=(scrollY/max)*TOTAL*2.2; },{passive:true});
function resize(){ renderer.setSize(innerWidth,innerHeight); cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix(); }
addEventListener('resize',resize); resize();
try{ renderer.compile(scene,cam); }catch(e){}
let t=0;
function frame(){ requestAnimationFrame(frame); t+=0.016;
  scroll += (tScroll-scroll)*0.08 + 0.015;                 // eased scroll + gentle auto-drift
  planes.forEach(m=>{
    let y=m.userData.baseY + scroll;
    y = ((y % TOTAL)+TOTAL)%TOTAL;                          // wrap 0..TOTAL
    if(y>TOTAL/2) y-=TOTAL;                                 // centre around camera
    m.position.y=y;
    m.rotation.x = -y*0.16;                                 // bow/curve as it rolls past
    m.position.z = -Math.abs(y)*0.14;                       // push back at edges (cylinder)
    m.scale.setScalar(1.0 - Math.min(0.18,Math.abs(y)*0.03));
  });
  renderer.render(scene,cam);
}
requestAnimationFrame(frame);
window.__idyll=()=>({three:THREE.REVISION,planes:planes.length,loaded:planes.filter(p=>p.material.uniforms.uHas.value).length,webgl:!!renderer.getContext()});
})();
