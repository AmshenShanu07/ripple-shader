import './style.css'
import * as THREE from 'three';
import { DRACOLoader, GLTFLoader, OrbitControls } from 'three/examples/jsm/Addons.js';

import gsap from 'gsap';
import planeVertexShader from './shaders/plane.vertex.glsl';
import planeFragmentShader from './shaders/plane.fragment.glsl';
import Stats from 'three/examples/jsm/libs/stats.module.js';

class World {
  constructor() {
    this.renderer;
    this.scene;
    this.clock;
    this.camera;
    this.plane;
    this.canBottle;
    this.raycaster;
    this.stat;
    this.isProgress = false;
    this.mousePos = new THREE.Vector3(-1.0,-1.0,-1.0);
    this.state = { progress: 0 }

    this.gltfLoader_ = new GLTFLoader();
    this.textureLoader_ = new THREE.TextureLoader();

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderConfig({ type: 'js' });
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    this.gltfLoader_.setDRACOLoader( dracoLoader );

    this.canvas = document.getElementById('webgl'); 

    this.size = {
      width: innerWidth,
      height: innerHeight,
      aspect: innerWidth/innerHeight,
      pixalRatio: Math.min(devicePixelRatio,2)
    }

    this.animate_ = this.animate_.bind(this);
    
    this.init_();
    
    addEventListener('resize',() => this.resize_());    
    this.animate_()
  }

  init_() { 
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(40,this.size.aspect,0.01,100)
    this.camera.position.set(0, 0, 10);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true,});
    this.renderer.setSize(this.size.width, this.size.height);
    this.renderer.setPixelRatio(this.size.pixalRatio);

    this.clock = new THREE.Clock();

    this.control = new OrbitControls(this.camera, this.canvas);
    this.control.enableDamping = true;
    this.control.dampingFactor = 0.5;

    this.stat = new Stats();
    document.body.appendChild(this.stat.dom);
    
    //Creating Scene
    this.raycaster_();
    this.addCanBottle();
    // this.planeMesh();

  }

  sphereMesh() {
    this.plane = new THREE.Mesh(
      new THREE.SphereGeometry(1,100,100),
      // new THREE.TorusGeometry( 1, 0.3, 16, 100 ),
      new THREE.ShaderMaterial({
        vertexShader: planeVertexShader,
        fragmentShader: planeFragmentShader,
        transparent: true,
        uniforms: {
          uMousePos: new THREE.Uniform(this.mousePos.clone()),
          uPrograss: new THREE.Uniform(0.0),
          uIsProgress: new THREE.Uniform(0),
        }
      }),
    );

    this.scene.add(this.plane);
  }

  addCanBottle() {
    const texture = this.textureLoader_.load('./texture.png')
    this.gltfLoader_.load('./model/canBottle.glb',(glb) => {
      const canGeometry = glb.scene.children[0].geometry;
      
      this.plane = new THREE.Mesh(
        canGeometry,
        new THREE.ShaderMaterial({
          vertexShader: planeVertexShader,
          fragmentShader: planeFragmentShader,
          transparent: true,
          uniforms: {
            uMousePos: new THREE.Uniform(this.mousePos.clone()),
            uPrograss: new THREE.Uniform(0.0),
            uIsProgress: new THREE.Uniform(0),
            uTexture: new THREE.Uniform(texture),
          }
        }),
      )

      this.plane.rotation.z = Math.PI * 0.1;

      this.scene.add(this.plane);
      
    })
  }

  onMouseEnter () {
    if (this.state.progress !== 0) return;

    const intersect = this.raycaster.intersectObject(this.plane)
    
    this.isProgress  = true;
    if(intersect.length) {

      this.mousePos.copy(this.plane.worldToLocal(intersect[0].point).clone());
      this.plane.material.uniforms.uMousePos.value.copy(this.mousePos.clone());
      this.isProgress = true;
      console.log(this.state.progress);
      
      gsap.to(
        this.state,
        {
          progress: this.state.progress > 0?0:1,
          duration: 1,
          onComplete: () => {
            this.state.progress = 0;
            this.isProgress = false;
          }
        }
      )
    }

  }

  raycaster_ () {
    this.raycaster = new THREE.Raycaster();
    this.raycaster.setFromCamera(this.mousePos,this.camera);

    addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      
      this.mousePos.set(x,y);
    })

  }

  resize_() {
    this.size.width = innerWidth;
    this.size.height = innerHeight;
    this.size.aspect = innerWidth/innerHeight;

    this.camera.aspect = this.size.aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.size.width, this.size.height);

    this.control.update();
  }

  animate_() {
    const elapsedTime = this.clock.getElapsedTime();
  
    this.raycaster.setFromCamera(this.mousePos,this.camera);

    if(this.plane) {

      this.plane.rotation.y = elapsedTime;

      const intersect = this.raycaster.intersectObject(this.plane)
      
      if(intersect.length)
        this.onMouseEnter()

      this.plane.material.uniforms.uPrograss.value = this.state.progress;
      this.plane.material.uniforms.uIsProgress.value = this.isProgress?1:0;
    }

    this.control.update();
    this.renderer.render(this.scene,this.camera);
    this.stat.update();
    window.requestAnimationFrame(this.animate_)
  }

}

const _ = new World();
