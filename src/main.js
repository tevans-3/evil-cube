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

class PickHelper { 
    constructor() { 
        this.raycaster = new THREE.Raycaster();
        this.raycaster.layers.set(0);
        this.pickedObject = null; 
        this.pickedObjectSavedColor = 0; 
    }

    pick(normalizedPosition, scene, camera, time) {
        console.log(this.pickedObject);
        if (this.pickedObject) {
            this.pickedObject.material.forEach(material => material.emissive.setHex(this.pickedObjectSavedColor)); 
            this.pickedObject = undefined; 
        }

        this.raycaster.setFromCamera(normalizedPosition, camera); 
        const intersectedObjects = this.raycaster.intersectObjects(scene.children, true);

        if (intersectedObjects.length) { 
            this.pickedObject = intersectedObjects[0].object;
            this.pickedObject.material.forEach(material => material.emissive.setHex((time*8) %2 > 1 ? 0xFFFF00 : 0xFF0000));
        }
    }
}

const pickPosition = {x: 0, y: 0}; 
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
  pickPosition.y = (pos.y / canvas.height) * -2 + 1;  // note we flip Y
}
 
function clearPickPosition() {
  pickPosition.x = -100000;
  pickPosition.y = -100000;
}
 
window.addEventListener('mousemove', setPickPosition);
window.addEventListener('mouseout', clearPickPosition);
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


var orbitControl = new OrbitControls(camera, canvas); 
var SCREEN_HEIGHT = window.innerHeight; 
var SCREEN_WIDTH = window.innerWidth; 


function isMouseOverCube(mouseX, mouseY) { 
    var directionVector = new THREE.Vector3(); 

    var x = ( mouseX / SCREEN_WIDTH) * 2 -1; 
    var y = -( mouseY / SCREEN_HEIGHT ) * 2 + 1; 

    directionVector.set(x, y, 1); 

    directionVector.sub(camera.position); 
    directionVector.normalize(); 
    raycaster.setFromCamera(directionVector, camera); 

    return raycaster.intersectObjects(allCubes, true).length > 0; 
}

//Returns the axis with the greatest magnitude in vector v 
function principalComponent(v) { 
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

function nearlyEqual(a, b, d) { 
    d = d || 0.001; 
    return Math.abs(a - b) <= 3;
}

var clickVector, clickFace; 

var lastCube; 

function setActiveGroup(axis) { 
    if (clickVector) { 
        activeGroup = [];

        allCubes.forEach(function(cube) { 
            if(nearlyEqual(cube.rubikPosition[axis], clickVector[axis])) { 
                activeGroup.push(cube); 
            }
        }); 
    } else { } 
}

var startNextMove = function() { 
    if (clickVector) { 
        if (!isMoving) { 
            isMoving = true; 
            moveAxis = axis; 
            moveDirection = direction; 

            setActiveGroup(axis); 

            pivot.rotation.set(0,0,0); 
            pivot.updateMatrixWorld(); 
            scene.add(pivot); 

            activeGroup.forEach(function(e) { 
                THREE.SceneUtils.attach(e, scene, pivot); 
            }); 
        }
    }
}

var onCubeMouseDown = function(e, cube) { 
    disableCameraControl(); 
    if(true || !isMoving) { 
        clickVector = cube.rubikPosition.clone(); 
        var centroid = e.targetFace.centroid.clone(); 
        centroid.applyMatrix4(cube.matrixWorld); 

        if (nearlyEqual(Math.abs(centroid.x), maxExtent))
            clickFace = 'x'; 
        else if (nearlyEqual(Math.abs(centroid.y), maxExtent))
            clickFace = 'y'; 
        else if (nearlyEqual(Math.abs(centroid.z), maxExtent))
            clickFace = 'z'; 
    }
}; 

var transitions = {
    'x': {'y': 'z', 'z': 'y'}, 
    'y': {'x': 'z', 'z': 'x'}, 
    'z': {'x': 'y', 'y': 'x'}
}

var onCubeMouseUp = function(e, cube) { 
    if (clickVector) { 
        var dragVector = cube.rubikPosition.clone(); 
        dragVector.sub(clickVector); 

        if (dragVector.length() > cubeSize) { 
            var dragVectorOtherAxes = dragVector.clone();
            dragVectorOtherAxes[clickFace] = 0; 
            var maxAxis = principalComponent(dragVectorOtherAxes); 
            var rotateAxis = transitions[clickFace][maxAxis], 
                direction = dragVector[maxAxis] >= 0 ? 1 : -1;
            if (clickFace == 'z' && rotateAxis == 'x' || 
                clickFace == 'x' && rotateAxis == 'z' ||
                clickFace == 'y' && rotateAxis == 'z') 
                direction *= -1; 

            if (clickFace == 'x' && clickVector.x > 0 || 
                clickFace == 'y' && clickVector.y < 0 ||
                clickFace == 'z' && clickVector.z < 0)
                direction *= -1; 

            startNextMove();
            enableCameraControl(); 
        }
    }
};

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
