import * as THREE from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { Line2 } from 'three/addons/lines/Line2.js';

const NUM_CUBELETS = 27;
//Picking identifies the location a user's mouse clicked on or is hovering over. 
//threejs.org/manual/#en/picking 
class GPUPickHelper {
    constructor() {
        this.pickingTexture = new THREE.WebGLRenderTarget(1, 1);
        this.pixelBuffer = new Uint8Array(4);
        this.pickedObject = null;
        this.pickedObjectSavedColor = 0;
    }

    pick(cssPosition, scene, camera, time) {
        const { pickingTexture, pixelBuffer } = this;

        if (this.pickedObject) {
            this.pickedObject.material[0].emissive.setHex(this.pickedObjectSavedColor);
            this.pickedObject = undefined;
        }

        const pixelRatio = renderer.getPixelRatio();
        camera.setViewOffset(
            renderer.getContext().drawingBufferWidth,
            renderer.getContext().drawingBufferHeight,
            cssPosition.x * pixelRatio | 0,
            cssPosition.y * pixelRatio | 0,
            1,
            1,
        );

        renderer.setRenderTarget(pickingTexture);
        renderer.render(pickingScene, camera);
        renderer.setRenderTarget(null);

        camera.clearViewOffset();

        renderer.readRenderTargetPixels(
            pickingTexture,
            0,
            0,
            1,
            1,
            pixelBuffer);

        const id =
            (pixelBuffer[0] << 16) |
            (pixelBuffer[1] << 8) |
            (pixelBuffer[2]);

        const intersectedObject = cubeletIds[id];
        if (intersectedObject && typeof intersectedObject != undefined) {
            this.pickedObject = intersectedObject;
            this.pickedObject.material.forEach((m, i) => {
                this.pickedObjectSavedColor = this.pickedObject.material[i].emissive.getHex();
                this.pickedObject.material[i].emissive.setHex((time * 8) % 2 > 1 ? 0xFFFF00 : 0xFF0000);
            });
        }
    }
}

const pickPosition = { x: 0, y: 0 };
clearPickPosition();

function getCanvasRelativePosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
    };
}

function setPickPosition(event) {
    const pos = getCanvasRelativePosition(event);
    pickPosition.x = pos.x;
    pickPosition.y = -pos.y;
}

function clearPickPosition() {
    pickPosition.x = -100000;
    pickPosition.y = -100000;
}

window.addEventListener('mousedown', setPickPosition);
window.addEventListener('mouseup', clearPickPosition);

window.addEventListener('touchstart', (event) => {
    event.preventDefault();
    setPickPosition(event.touches[0]);
}, { passive: false });

window.addEventListener('touchmove', (event) => {
    setPickPosition(event.touches[0]);
});

window.addEventListener('touchend', clearPickPosition);

//initializing scene and camera 
const scene = new THREE.Scene();
scene.background = new THREE.Color('black');

//initializing second picking scene 
const pickingScene = new THREE.Scene();
pickingScene.background = new THREE.Color(0);

//FOV, aspect ratio are the PerspectiveCamera attributes
const camera = new THREE.PerspectiveCamera(30,
    window.innerWidth / window.innerHeight);

camera.position.set(3, 5, 3);
camera.lookAt(scene.position);

//initializing renderer 
const renderer = new THREE.WebGLRenderer({ antialias: true });
var ambientLight = new THREE.AmbientLight('white', 1);
scene.add(ambientLight);

//let there be light
var light = new THREE.DirectionalLight('white', 1);
light.position.set(1, 1, 1);
scene.add(light);

renderer.setSize(window.innerWidth + 10, window.innerHeight + 10);
document.body.appendChild(renderer.domElement);

const canvas = renderer.domElement;
document.body.appendChild(canvas);
var time = 1;
//camera.position.z = 5;

const NUM_CUBELETS_PER_ROW = 3;
const CUBELET_SIZE = 1 / 3;
const FACE_COLORS = ["#FF0000",
    "#FF6400",
    "#FFFF00",
    "#00BB00",
    "#0000BB",
    "#FFFFFF"
];

const pickHelper = new GPUPickHelper();

const loader = new THREE.TextureLoader();
const texture = loader.load('resources/images/frame.png');

const cubeletIds = {};

function initRubiksCube(scene) {

    var ids = Array.from({ length: 6 }, (_, index) => index);
    var cube = new THREE.Group();
    var pickingCube = new THREE.Group();
    let id = 1;
    for (let i = 0; i < NUM_CUBELETS_PER_ROW; i++) {
        for (let j = 0; j < NUM_CUBELETS_PER_ROW; j++) {
            for (let k = 0; k < NUM_CUBELETS_PER_ROW; k++) {

                var cubelet = new THREE.Mesh(
                    new THREE.BoxGeometry(CUBELET_SIZE, CUBELET_SIZE, CUBELET_SIZE),
                    [
                        new THREE.MeshPhongMaterial({ color: FACE_COLORS[0], alphaTest: 0.5 }),
                        new THREE.MeshPhongMaterial({ color: FACE_COLORS[1], alphaTest: 0.5 }),
                        new THREE.MeshPhongMaterial({ color: FACE_COLORS[2], alphaTest: 0.5 }),
                        new THREE.MeshPhongMaterial({ color: FACE_COLORS[3], alphaTest: 0.5 }),
                        new THREE.MeshPhongMaterial({ color: FACE_COLORS[4], alphaTest: 0.5 }),
                        new THREE.MeshPhongMaterial({ color: FACE_COLORS[5], alphaTest: 0.5 }),
                    ]
                );

                cubelet.position.x += i / NUM_CUBELETS_PER_ROW;
                cubelet.position.y += j / NUM_CUBELETS_PER_ROW;
                cubelet.position.z += k / NUM_CUBELETS_PER_ROW;

                cubelet.name = `cubelet_${i}${j}${k}`;
                scene.add(cubelet);

                const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBELET_SIZE, CUBELET_SIZE, CUBELET_SIZE));
                const lineMaterial = new THREE.LineBasicMaterial({ color: 'black' });
                const wireframe = new THREE.LineSegments(edges, lineMaterial);
                cubelet.add(wireframe);
                cube.add(cubelet);

                //create separate materials for offscreen rendering
                const pickingMaterials = ids.map(id => new THREE.MeshPhongMaterial({
                    emissive: new THREE.Color().setHex(id, THREE.NoColorSpace),
                    color: new THREE.Color(0, 0, 0),
                    specular: new THREE.Color(0, 0, 0),
                    map: texture,
                    alphaTest: 0.5,
                    blending: THREE.NoBlending,
                }));

                const pickingCubelet = new THREE.Mesh(
                    new THREE.BoxGeometry(CUBELET_SIZE, CUBELET_SIZE, CUBELET_SIZE),
                    pickingMaterials
                );

                pickingCubelet.name = `cubelet_${i}${j}${k}`;
                cubeletIds[id] = cubelet;
                id += 1;
                pickingScene.add(pickingCubelet);
                pickingCubelet.position.copy(cubelet.position);
                pickingCubelet.rotation.copy(cubelet.rotation);
                pickingCubelet.scale.copy(cubelet.scale);
                pickingCube.add(pickingCubelet);
            }
        }
    }
    pickingCube.position.copy(cube.position);
    pickingCube.rotation.copy(cube.rotation);
    pickingCube.scale.copy(cube.scale);
    return [cube, pickingCube];
}

function handleClick() {
    ;
}

function handleUpDown() {
    ;
}

function handleRightLeft() {
    ;
}

function handleFrontBack() {
    ;
}

const cubes = initRubiksCube(scene);
const cube = cubes[0];
const pickingCube = cubes[1];
scene.add(cube);
pickingScene.add(pickingCube);
function animate() {
    time *= 0.001;
    //cube.rotation.x += 0.01;
    //cube.rotation.y += 0.01;
    pickHelper.pick(pickPosition, pickingScene, camera, time);
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate); 