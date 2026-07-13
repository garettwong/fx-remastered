/* CURRENT — a stream of image planes flowing along a 3D spline (matched to the @DavidJason1820 ref).
   Three.js r128, billboarded photos travelling a CatmullRom curve, driven by scroll + drift. */
(function(){
const canvas=document.getElementById('gl');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
renderer.setClearColor(0xf6f5f2,1);
const scene=new THREE.Scene();
const cam=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,0.1,100); cam.position.set(0,0,9);
const curve=new THREE.CatmullRomCurve3([
  new THREE.Vector3(-7,-2,-9), new THREE.Vector3(-3,2,-3), new THREE.Vector3(1,-1,2),
  new THREE.Vector3(4,2,6), new THREE.Vector3(1,3,3), new THREE.Vector3(-2,1,-1),
  new THREE.Vector3(-5,-2,-5)
], true, 'catmullrom', 0.5);
const IMGS=['s1','s2','s3','s4','s5','s6'];
const texs=IMGS.map(n=>{ const t=new THREE.TextureLoader().load('img/'+n+'.jpg'); t.minFilter=THREE.LinearFilter; t.generateMipmaps=false; return t; });
const NUM=44, planes=[];
for(let i=0;i<NUM;i++){ const m=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.9),
    new THREE.MeshBasicMaterial({map:texs[i%texs.length],transparent:true,depthWrite:false}));
  m.userData.u=i/NUM; scene.add(m); planes.push(m); }
let off=0, tOff=0;
addEventListener('scroll',()=>{ const max=Math.max(1,document.documentElement.scrollHeight-innerHeight); tOff=(scrollY/max); },{passive:true});
function resize(){ renderer.setSize(innerWidth,innerHeight); cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix(); }
addEventListener('resize',resize); resize();
try{ renderer.compile(scene,cam); }catch(e){}
const p3=new THREE.Vector3();
function frame(){ requestAnimationFrame(frame);
  off += (tOff-off)*0.06 + 0.0005;                        // eased scroll + drift
  planes.forEach((m,i)=>{ let u=(m.userData.u + off)%1; if(u<0)u+=1;
    curve.getPointAt(u,p3); m.position.copy(p3);
    m.quaternion.copy(cam.quaternion);                    // billboard
    const s=0.55+0.55*Math.sin(u*Math.PI*2*0+u*3.14);     // gentle size variation along path
    m.scale.setScalar(0.7+0.4*Math.abs(Math.sin(u*6.28+off*6.28)));
    m.renderOrder = Math.round((5-m.position.z)*100);
  });
  renderer.render(scene,cam);
}
frame();
window.__current=()=>({three:THREE.REVISION,planes:planes.length,webgl:!!renderer.getContext()});
})();
