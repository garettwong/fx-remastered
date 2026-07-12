/* PRISM — real WebGL liquid-glass refraction: drifting lenses (one is the cursor) refract
   + chromatically split an animated colour field. Three.js r128, single fullscreen shader. */
(function(){
const canvas=document.getElementById('gl');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
const scene=new THREE.Scene(), cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const U={ uRes:{value:new THREE.Vector2(1,1)}, uTime:{value:0}, uLens:{value:[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()]} };
const FRAG=`
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec3 uLens[4];
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));
 return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*vn(p);p*=2.03;a*=.5;}return v;}
vec3 palette(float t){
 vec3 c1=vec3(0.24,0.12,0.55), c2=vec3(0.92,0.28,0.55), c3=vec3(0.18,0.72,0.95), c4=vec3(0.99,0.66,0.36);
 t=fract(t);
 vec3 a=mix(c1,c2,smoothstep(0.0,0.4,t));
 vec3 b=mix(c3,c4,smoothstep(0.55,1.0,t));
 return mix(a,b,smoothstep(0.35,0.7,t));
}
vec3 bg(vec2 uv){
 vec2 p=uv*1.7;
 float n=fbm(p+vec2(uTime*0.045,uTime*0.03))+0.35*fbm(p*2.1-uTime*0.02);
 vec3 col=palette(n*0.7);
 col*=0.55+0.6*fbm(p*0.7+uTime*0.015);
 return col;
}
void main(){
 vec2 uv=gl_FragCoord.xy/uRes; float asp=uRes.x/uRes.y;
 vec2 st=uv; st.x*=asp;
 vec3 col=bg(uv);
 for(int i=0;i<4;i++){
  vec2 c=uLens[i].xy; float rad=uLens[i].z; if(rad<=0.0) continue;
  vec2 toC=st-c; float d=length(toC)/rad;
  if(d<1.0){
   float h=sqrt(1.0-d*d);
   vec2 refr=(toC/rad)*(1.0-h)*0.16;
   vec2 ruv=uv-vec2(refr.x/asp,refr.y);
   vec3 g; float ca=0.006*(1.0-h);
   g.r=bg(ruv-vec2(ca,0.0)).r; g.g=bg(ruv).g; g.b=bg(ruv+vec2(ca,0.0)).b;
   float spec=pow(max(0.0,dot(normalize(vec3(toC,h*rad)),normalize(vec3(-0.4,0.55,0.75)))),22.0);
   g+=spec*0.9;
   float rim=smoothstep(0.68,1.0,d); g=mix(g,g*1.18+0.05,rim);
   float edge=smoothstep(1.0,0.95,d);
   col=mix(col,g,edge);
  }
 }
 col=pow(clamp(col,0.0,1.0),vec3(0.94));
 gl_FragColor=vec4(col,1.0);
}`;
const mat=new THREE.ShaderMaterial({uniforms:U,fragmentShader:FRAG,vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}'});
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat));
function resize(){ renderer.setSize(innerWidth,innerHeight); U.uRes.value.set(innerWidth,innerHeight); }
addEventListener('resize',resize); resize();
try{ renderer.compile(scene,cam); }catch(e){ console.error('PRISM compile',e); }
const mouse={x:-1,y:-1,has:false};
addEventListener('pointermove',e=>{ const asp=innerWidth/innerHeight; mouse.x=(e.clientX/innerWidth)*asp; mouse.y=1-e.clientY/innerHeight; mouse.has=true; },{passive:true});
addEventListener('pointerleave',()=>mouse.has=false);
const orbs=[{r:0.15,ax:0.26,ay:0.16,px:0.30,py:0.62,sx:0.11,sy:0.15},{r:0.12,ax:0.22,ay:0.2,px:0.66,py:0.4,sx:0.08,sy:0.13},{r:0.13,ax:0.3,ay:0.14,px:0.5,py:0.7,sx:0.14,sy:0.09}];
let t=0;
function frame(){ requestAnimationFrame(frame); t+=0.016; U.uTime.value=t;
 const asp=innerWidth/innerHeight, L=U.uLens.value;
 L[0].set(mouse.has?mouse.x:-9, mouse.has?mouse.y:-9, mouse.has?0.17:0);
 for(let i=0;i<orbs.length;i++){ const o=orbs[i];
   L[i+1].set((o.px+o.ax*Math.sin(t*o.sx+i))*asp, o.py+o.ay*Math.cos(t*o.sy+i*1.7), o.r); }
 renderer.render(scene,cam);
}
requestAnimationFrame(frame);
window.__prism=()=>({three:THREE.REVISION,lenses:U.uLens.value.length,webgl:!!renderer.getContext(),res:[U.uRes.value.x,U.uRes.value.y]});
})();
