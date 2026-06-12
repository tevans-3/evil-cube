import * as THREE from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'; 
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'; 

// CITATIONS 
//
// 1. THREE.js documentation 
// 2. https://github.com/joews/rubik-js/blob/master/rubik.rubik-js 
// 3. https://cs.stanford.edu/people/karpathy/reinforcejs/
//

const debug = true; 

function _principalComponent(v) { 
    var maxAxis = 'x', 
        max = Math.abs(v.x); 

    if (Math.abs(v.y) > max) { 
        maxAxis = 'y';
        max = Math.abs(v.y); 
    }

    if (Math.abs(v.z) > max) { 
        maxAxis = 'z'; 
        max = Math.abs(v.z); 
    }
    return maxAxis; 
}

class GestureStateMachine {
    constructor() { 
        this.hovering = true; 
        this.clicking = false; 
        this.dragging = false; 
        this.animating = false; 
        this.stopped = false; 
        this.mousePosition = null; 
        this.clickedOnPoint = null; 
        this.rotateAroundAxis = null; 
        this.clickedOnFace = null; 
        this.clickedOnFacePlane = null; 
        this.dragDir = null; 
    }

    update(state) { 
        switch (action) { 
            case "hovering": 
                this.hovering = true; 
            default:
                return;
        }
    }
}

class PickHelper { 
    constructor() { 
        this.raycaster = new THREE.Raycaster();
        this.raycaster.layers.set(0);
        this.faceNormal = null; 
        this.point = null; 
        this.pickedObject = null; 
        this.pickedObjectSavedColor = 0; 
    }

    pick(normalizedPosition, scene, camera, time) {
        if (this.pickedObject) {
            this.pickedObject.material.forEach(material => material.emissive.setHex(this.pickedObjectSavedColor)); 
            this.pickedObject = undefined; 
        }

        this.raycaster.setFromCamera(normalizedPosition, camera); 
        const intersectedObjects = this.raycaster.intersectObjects(scene.children, true);

        if (intersectedObjects.length) { 
            this.pickedObject = intersectedObjects[0].object;
            // faceNormal is the vector perpendicular to the clicked-on face 
            // of the cube's axes, of the face's in-plane axes, the face normal 
            // is the only out-of-plane axis (it's perpendicular)
            this.faceNormal = intersectedObjects[0].face.normal;

            // this is the clicked-on point, intersected by the camera's ray 
            this.point = intersectedObjects[0].point; 

            // .transformDirection is the rotation
            // applying it here transforms the face normal to the world normal 
            // (lifts it out of the cubelet's local geometry into the world geomtry)
            const worldNormal = this.faceNormal.clone() 
                        .transformDirection(this.pickedObject.matrixWorld);
            
            // this takes the camera's ray's intersected clicked-on point and uses it 
            // to set the plane of the clicked-on face 
            let plane = new THREE.Plane(worldNormal)
                            .setFromNormalAndCoplanarPoint(worldNormal, this.point); 

            // the cube has six faces: +X (right), -X (left), +Z (front), -Z (back), 
            // +Y (up), -Y (down). The question of "Which face was clicked?" is the 
            // question of "Which one of these unit vectors is aligned to the normal
            // of the clicked-on face transformed into world space?"
            //
            // any vector direction relative to these axes maps to a value 
            // in [-1,1] where -1 is "pointing in the opposite direction", 0 is 
            // "perpendicular", and 1 is "parallel and pointing in the same direction"
            // 
            // any vector's components are dot products with the unit vectors e.g. 
            // given a vector n, n.x = n * (1,0,0). So the world normal's components 
            // describe "how parallel is this axis to the clicked-on face"? 
            // 
            // the principal component gives us the largest magnitude component (axis), 
            // which is the component nearest to 1, in other words, the most nearly parallel
            const axis = _principalComponent(worldNormal);

            // the sign gives us which specific face e.g. +X or -X 
            const side = Math.sign(worldNormal[axis]);

            this.pickedObject.material.forEach(material => material.emissive.setHex((time*8) %2 > 1 ? 0xFFFF00 : 0xFF0000));
        }
    }
}

const pickPosition = {x: 0, y: 0}; 
const mousePosition = {x: 0, y: 0}; 
clearPickPosition();

function getCanvasRelativePosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width  / rect.width,
    y: (event.clientY - rect.top ) * canvas.height / rect.height,
  };
}
 
function setPickPosition(event) {
  const pos = getCanvasRelativePosition(event);
  pickPosition.x = (pos.x / canvas.width ) *  2 - 1;
  pickPosition.y = (pos.y / canvas.height) * -2 + 1;  
}
 
function clearPickPosition() {
  pickPosition.x = -100000;
  pickPosition.y = -100000;
}

var mouseMoveDirection = ''; 

window.addEventListener('mousedown', (e) => { 

setPickPosition(e);});
window.addEventListener('mouseup', clearPickPosition);
window.addEventListener('mousemove', (e) => { 
    if (e.movementX > 0) {
        mouseMoveDirection = "Right"; 
    } else if (e.movementX < 0) { 
        mouseMoveDirection = "Left"; 
    }

    if (e.movementY > 0) { 
        mouseMoveDirection = "Down";  
    } else if (e.movementY < 0) { 
        mouseMoveDirection = "Up"; 
    }
}); 
window.addEventListener('mouseleave', clearPickPosition);

window.addEventListener('touchstart', (event) => { 
    event.preventDefault(); 
    setPickPosition(event.touches[0]); 
}, {passive: false}); 
window.addEventListener('touchmove', (event) => { 
    setPickPosition(event.touches[0]); 
}); 
window.addEventListener('touchend', clearPickPosition); 

const NUM_CUBELETS = 27;

function enableCameraControl() { 
    orbitControl.noRotate = false; 
}

function disableCameraControl() { 
    orbitControl.noRotate = true; 
}

//initializing scene and camera 
const scene = new THREE.Scene();
scene.background = new THREE.Color('black');

//FOV, aspect ratio are the PerspectiveCamera attributes
const camera = new THREE.PerspectiveCamera(30,
    window.innerWidth / window.innerHeight);

camera.position.set(3, 5, 3);
camera.lookAt(scene.position);
camera.layers.enable(1); 

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

// 
function rotate(cube, clickedCubelet) { 

}

if (debug) { 
    // X == red, Y == green, Z == blue
    const axesHelper = new THREE.AxesHelper(5); scene.add(axesHelper);
}

const NUM_CUBELETS_PER_ROW = 3;
const CUBELET_SIZE = 1 / 3;
const FACE_COLORS = ["#FF0000",
    "#FF6400",
    "#FFFF00",
    "#00BB00",
    "#0000BB",
    "#FFFFFF", 
    "#000000"
];


const loader = new THREE.TextureLoader();
const texture = loader.load('resources/images/frame.png');

const cubeletIds = {};

function initRubiksCube(scene) {

    var ids = Array.from({ length: 6 }, (_, index) => index);
    var cube = new THREE.Group();
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
                cubelet.rubikPosition = cubelet.position.clone(); 

                cubelet.name = `cubelet_${i}${j}${k}`;
                scene.add(cubelet);
                let edgeLord = new THREE.BoxGeometry(CUBELET_SIZE, CUBELET_SIZE, CUBELET_SIZE); 
                const edges = new THREE.EdgesGeometry(edgeLord, 1); 
                const positions = edges.attributes.position.array;
                const lineGeometry = new LineSegmentsGeometry().fromEdgesGeometry(edges);  
                lineGeometry.setPositions(positions); 
                const lineMaterial = new LineMaterial({ 
                    color: 'black', 
                    linewidth: 10,
                    gapSize: 1,
                    resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)})
                ;
                const cubeEdges = new LineSegments2(lineGeometry, lineMaterial);
                cubeEdges.layers.set(1);
                cubelet.add(cubeEdges);
                cube.add(cubelet);

                cubeletIds[id] = cubelet;
                id += 1;
            }
        }
    }
    return cube;
}

function handleMove() {
    ;
}

const cube = initRubiksCube(scene);
scene.add(cube);
const pickHelper = new PickHelper();
function animate() {
    time *= 0.001;
    pickHelper.pick(pickPosition, scene, camera, time); 
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate); 
