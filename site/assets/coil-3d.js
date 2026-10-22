import * as THREE from './vendor/three.module.js';

const host = document.getElementById('model');
try {
  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: false});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
  renderer.setClearColor(0xedf1e7);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.querySelector('.loading-3d').remove();
  host.prepend(renderer.domElement);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', 'Drehbares 3D-Modell einer Spule mit Magnetfeld. Mit den Pfeiltasten oder durch horizontales Ziehen drehen.');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 60);
  const assembly = new THREE.Group();
  scene.add(assembly);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7d8c72, 3));
  const sun = new THREE.DirectionalLight(0xffeed1, 4);
  sun.position.set(-3, 6, 8); scene.add(sun);
  const copper = new THREE.MeshStandardMaterial({color: 0xc18a54, metalness: .65, roughness: .28});
  const coil = new THREE.Mesh(new THREE.BufferGeometry(), copper);
  assembly.add(coil);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,5.1,48),new THREE.MeshStandardMaterial({color:0x788c7b,metalness:.45,roughness:.4}));
  core.rotation.z = Math.PI/2; assembly.add(core);
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,4.3,48,1,true),new THREE.MeshStandardMaterial({color:0xd8dfc7,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false}));
  shell.rotation.z=Math.PI/2; assembly.add(shell);
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.55,0,0),new THREE.Vector3(-1.4,0,0),new THREE.Vector3(1.4,0,0),new THREE.Vector3(2.55,0,0),
    new THREE.Vector3(3.1,.9,0),new THREE.Vector3(1.9,1.65,0),new THREE.Vector3(0,1.85,0),new THREE.Vector3(-1.9,1.65,0),new THREE.Vector3(-3.1,.9,0)
  ],true,'catmullrom',.3);
  const tracks=[];
  const dotGeometry=new THREE.SphereGeometry(.045,9,7);
  const dotMaterial=new THREE.MeshBasicMaterial({color:0x548454});
  for(let j=0;j<6;j++) {
    const group=new THREE.Group(); group.rotation.x=j*Math.PI/3;
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(path.getPoints(180)),new THREE.LineBasicMaterial({color:0x739568,transparent:true,opacity:.4}));
    group.add(line);
    const dots=[];
    for(let k=0;k<5;k++){const dot=new THREE.Mesh(dotGeometry,dotMaterial);group.add(dot);dots.push(dot);}
    assembly.add(group);tracks.push({group,line,dots});
  }
  function label(text,color,x) {
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
    const ctx=canvas.getContext('2d');ctx.font='600 68px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,64,64);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));sprite.scale.set(.75,.75,1);sprite.position.set(x,0,0);assembly.add(sprite);return sprite;
  }
  const north=label('N','#ac6944',3.65),south=label('S','#587f8b',-3.65);
  let state=window.coilState || {current:.5,turns:400,core:false,reverse:false,paused:false};
  let previousTurns=0;
  function update(next) {
    state=next;
    core.visible=state.core;
    if(previousTurns!==state.turns){
      const count=Math.round(state.turns/50), points=[];
      // The visible turns are symbolic. Their geometry changes with the N control.
      for(let i=0;i<=count*60;i++){const t=i/(count*60),angle=t*count*Math.PI*2;points.push(new THREE.Vector3(-2.1+t*4.2,.73*Math.cos(angle),.73*Math.sin(angle)));}
      coil.geometry.dispose();coil.geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),count*60,.055,8,false);previousTurns=state.turns;
    }
    north.position.x=state.reverse?-3.65:3.65;south.position.x=-north.position.x;
    north.visible=south.visible=state.current>0;
    tracks.forEach(track=>{track.group.visible=state.current>0;track.line.material.opacity=Math.min(.85,.14+state.current*state.turns/1300+(state.core?.15:0));});
    host.querySelector('canvas').setAttribute('aria-label',document.getElementById('model-description').textContent+' Mit Pfeiltasten oder Ziehen drehen.');
  }
  addEventListener('coilchange',event=>update(event.detail)); update(state);
  let yaw=.2,pitch=.28,drag=null,cameraDistance=10;
  function orient(){camera.position.set(cameraDistance*Math.sin(yaw)*Math.cos(pitch),cameraDistance*Math.sin(pitch),cameraDistance*Math.cos(yaw)*Math.cos(pitch));camera.lookAt(0,0,0);}
  orient();
  const canvas=renderer.domElement;
  canvas.addEventListener('pointerdown',event=>{drag={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);});
  canvas.addEventListener('pointermove',event=>{if(!drag)return;yaw-=(event.clientX-drag.x)*.008;pitch=Math.max(-1.1,Math.min(1.1,pitch+(event.clientY-drag.y)*.006));drag={x:event.clientX,y:event.clientY};orient();});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{drag=null;});
  canvas.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;event.preventDefault();if(event.key==='ArrowLeft')yaw-=.12;if(event.key==='ArrowRight')yaw+=.12;if(event.key==='ArrowUp')pitch=Math.min(1.1,pitch+.12);if(event.key==='ArrowDown')pitch=Math.max(-1.1,pitch-.12);if(event.key==='Home'){yaw=.2;pitch=.28;}orient();});
  function resize(){if(host.hidden)return;const {width,height}=host.getBoundingClientRect();if(width&&height){renderer.setSize(width,height,false);camera.aspect=width/height;cameraDistance=Math.max(10,4.7/(Math.tan(Math.PI/10)*camera.aspect));orient();camera.updateProjectionMatrix();}}
  new ResizeObserver(resize).observe(host);addEventListener('coilresize',resize);
  let visible=true;new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;}).observe(host);
  let last=0,phase=0;
  function frame(now){requestAnimationFrame(frame);const delta=Math.min((now-last)/1000,.05);last=now;if(!visible||document.hidden||host.hidden)return;if(!state.paused)phase+=(state.reverse?-1:1)*delta*(.035+.08*state.current);tracks.forEach(track=>track.dots.forEach((dot,i)=>{dot.position.copy(path.getPointAt(((phase+i/5)%1+1)%1));}));renderer.render(scene,camera);}
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();dispatchEvent(new Event('coilfailed'));});
  requestAnimationFrame(frame);dispatchEvent(new Event('coilready'));resize();
} catch(error) {
  console.warn('3D-Modell nicht verfügbar. Das Schnittbild bleibt nutzbar.');
  dispatchEvent(new Event('coilfailed'));
}
