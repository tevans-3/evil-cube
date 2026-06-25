import * as THREE from 'three';
import * as evil from '../shared.ts';
import type { InteractionState, Cubelet, Cube } from ".";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
export class ThreeScene {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    ambientLight: THREE.AmbientLight;
    light: THREE.DirectionalLight;
    canvas: any;
    time: number;
    controls: OrbitControls;
    pivot: THREE.Object3D; 
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

    init(bg: any, cam: any, camLayer: any) { 
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

    setUpScenePreRotation(state: InteractionState, e: MouseEvent | TouchEvent, touched: boolean, canvas: HTMLCanvasElement) { 
        evil._setPickPositionWrapper(e, touched, canvas);
        this.controls.enabled = true;
        if (!state.layerToRotate) {
            state.reset(); return;
        }
    }

    cleanUpSceneAfterRotation(state: InteractionState, q: THREE.Quaternion, cube: THREE.Object3D) { 
        this.pivot.quaternion.copy(q);
        state.layerToRotate.forEach((cubelet: Cubelet) => cube.attach(cubelet));
        this.scene.remove(this.pivot);
        evil._clearPickPosition();
        state.reset();
    }

    setUpPivot(state: InteractionState, center: THREE.Vector3) { 
        // have to attach the cubelets to a pivot parent object, whose only 
        // purpose in life is to rotate cubelet layers 
        this.pivot = new THREE.Object3D();
        this.pivot.position.copy(evil.center);
        this.scene.add(this.pivot);

        state.layerToRotate.forEach((cubelet: Cubelet) => this.pivot.attach(cubelet));
    }

    previewRotation(q: THREE.Quaternion) { 
        this.pivot.quaternion.copy(q);
        this.pivot.updateMatrixWorld(true);
    }
}