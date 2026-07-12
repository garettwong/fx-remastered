/* THRESHOLD — a monolith (ComfyUI still) reflected in rippling, cursor-reactive water.
   Matched to the @israelwegierski portal ref. Three.js r128 fullscreen composite shader. */
(function(){
const canvas=document.getElementById('gl');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
const scene=new THREE.Scene(), cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const U={ uImg:{value:null}, uImgRes:{value:new THREE.Vector2(1024,1024)}, uRes:{value:new THREE.Vector2(1,1)}, uTime:{value:0}, uMouse:{value:new THREE.Vector2(-9,-9)} };
const FRAG=`
precision highp float;
uniform sampler2D uImg; uniform vec2 uImgRes, uRes; uniform float uTime; uniform vec2 uMouse;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
const float HOR=0.44;
vec3 mono(vec2 uv){ float sa=uRes.x/uRes.y; float mx=(uv.x-0.5)*sa/0.62+0.5; float my=(uv.y-HOR)/(1.0-HOR);
  if(mx<0.0||mx>1.0||my<0.0||my>1.0) return vec3(0.0); return texture2D(uImg, vec2(mx,my)).rgb; }
void main(){
  vec2 uv=gl_FragCoord.xy/uRes; vec3 col;
  if(uv.y>=HOR){ col=mono(uv); }
  else{
    float depth=(HOR-uv.y)/HOR;
    float rip=sin(uv.x*22.0+uTime*1.2+vn(uv*6.0+uTime*0.3)*6.0)*0.5+0.5;
    float amp=0.010+0.03*depth;
    float dm=distance(uv,uMouse); float mr=sin(dm*60.0-uTime*4.0)*exp(-dm*11.0)*0.02;
    vec2 ruv=uv; ruv.x+=(rip-0.5)*amp*2.0+mr;
    ruv.y=HOR+(HOR-uv.y); ruv.y+=(vn(vec2(uv.x*10.0,uTime*0.5))-0.5)*amp*1.5+mr;
    col=mono(ruv)*0.45; col*=vec3(0.82,0.92,1.12);
    float streak=pow(max(0.0,sin(uv.y*30.0-uTime*0.8+vn(uv*vec2(3.0,14.0)+uTime*0.2)*4.0)),6.0);
    col+=streak*0.06*(0.4+depth);
    col+=vn(uv*uRes*0.5)*0.01;
  }
  col+=smoothstep(0.02,0.0,abs(uv.y-HOR))*vec3(0.10,0.13,0.16);
  gl_FragColor=vec4(col,1.0);
}`;
const mat=new THREE.ShaderMaterial({uniforms:U,fragmentShader:FRAG,vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}'});
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat));
new THREE.TextureLoader().load('img/monolith.jpg',t=>{ t.minFilter=THREE.LinearFilter; t.generateMipmaps=false; U.uImg.value=t; U.uImgRes.value.set(t.image.width,t.image.height); });
function resize(){ renderer.setSize(innerWidth,innerHeight); U.uRes.value.set(innerWidth,innerHeight); }
addEventListener('resize',resize); resize();
addEventListener('pointermove',e=>{ U.uMouse.value.set(e.clientX/innerWidth, 1-e.clientY/innerHeight); },{passive:true});
addEventListener('pointerleave',()=>U.uMouse.value.set(-9,-9));
let t=0; function frame(){ requestAnimationFrame(frame); t+=0.016; U.uTime.value=t; renderer.render(scene,cam); }
requestAnimationFrame(frame);
window.__threshold=()=>({three:THREE.REVISION,webgl:!!renderer.getContext(),imgLoaded:!!U.uImg.value,res:[U.uRes.value.x,U.uRes.value.y]});
})();
