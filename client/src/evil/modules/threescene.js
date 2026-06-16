import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
export class ThreeScene {
    constructor() { 
        this.scene = new THREE.Scene(); 
        this.camera = new THREE.PerspectiveCamera(30, 
            window.innerWidth / window.innerHeight); 
        this.renderer = new THREE.WebGLRenderer({ antialias: true }); 
        this.ambientLight = new THREE.AmbientLight('white', 1); 
        this.light = new THREE.DirectionalLight('white', 1); 
        this.canvas = this.renderer.domElement; 
        this.time = 1; 
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    }

    init(bg, cam, camLayer) { 
        this.scene.background = new THREE.Color(bg);
        this.scene.add(this.ambientLight); 
        this.camera.position.set(cam.x, cam.y, cam.z); 
        this.camera.lookAt(this.scene.position); 
        this.camera.layers.enable(camLayer); 
        // let there be light
        this.light.position.set(1, 1, 1); 
        this.scene.add(this.light); 
        this.controls.enableRotate = true;
        this.controls.enableZoom = false;
        this.controls.target.set(0, 0, 0);
        this.renderer.setSize(window.innerWidth, window.innerHeight); 
        document.body.appendChild(this.renderer.domElement); 
    }
}