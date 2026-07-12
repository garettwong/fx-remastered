/* OFFSET — a live metaball fluid rendered as a rotated HALFTONE (matched to the @SouravChhimpa1 ref).
   Three.js r128 fullscreen fragment shader, monochrome ink-on-paper. */
(function(){
const canvas=document.getElementById('gl');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
const scene=new THREE.Scene(), cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const U={ uRes:{value:new THREE.Vector2(1,1)}, uTime:{value:0}, uMouse:{value:new THREE.Vector2(-9,-9)} };
const FRAG=`
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse;
float field(vec2 p){
  float f=0.0;
  for(int i=0;i<5;i++){ float fi=float(i);
    vec2 c=vec2(0.9+0.55*sin(uTime*0.28+fi*1.9), 0.5+0.30*cos(uTime*0.23+fi*2.4));
    float d=length(p-c); f+=0.055/(d*d+0.006); }
  float dm=length(p-uMouse); f+=0.07/(dm*dm+0.006);
  return f;
}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes; float asp=uRes.x/uRes.y; vec2 st=uv; st.x*=asp;
  float a=0.42; mat2 rot=mat2(cos(a),-sin(a),sin(a),cos(a));
  vec2 gp=rot*st;
  float N=uRes.y/9.5;
  vec2 gN=gp*N; vec2 cell=floor(gN)+0.5;
  float inten=field(cell/N);
  float rad=clamp(pow(inten,0.5)*0.86,0.0,0.72);
  float dist=length(gN-cell);
  float ink=smoothstep(rad, rad-0.07, dist);
  vec3 paper=vec3(0.937,0.918,0.874), inkc=vec3(0.078,0.066,0.043);
  vec3 col=mix(paper,inkc,ink);
  col+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9,78.2)))*43758.5)-0.5)*0.015;
  gl_FragColor=vec4(col,1.0);
}`;
const mat=new THREE.ShaderMaterial({uniforms:U,fragmentShader:FRAG,vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}'});
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat));
function resize(){ renderer.setSize(innerWidth,innerHeight); U.uRes.value.set(innerWidth,innerHeight); }
addEventListener('resize',resize); resize();
addEventListener('pointermove',e=>{ const asp=innerWidth/innerHeight; U.uMouse.value.set((e.clientX/innerWidth)*asp, 1-e.clientY/innerHeight); },{passive:true});
addEventListener('pointerleave',()=>U.uMouse.value.set(-9,-9));
let t=0; function frame(){ requestAnimationFrame(frame); t+=0.016; U.uTime.value=t; renderer.render(scene,cam); }
requestAnimationFrame(frame);
window.__offset=()=>({three:THREE.REVISION,webgl:!!renderer.getContext(),res:[U.uRes.value.x,U.uRes.value.y]});
})();
