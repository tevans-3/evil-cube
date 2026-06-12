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

let canvas; 
const pickPosition = {x: 0, y: 0}; 
const mousePosition = {x: 0, y: 0};
var mouseMoveDirection = ''; 

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

function _getCanvasRelativePosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width  / rect.width,
    y: (event.clientY - rect.top ) * canvas.height / rect.height,
  };
}
 
function _setPickPosition(event) {
  const pos = _getCanvasRelativePosition(event);
  pickPosition.x = (pos.x / canvas.width ) *  2 - 1;
  pickPosition.y = (pos.y / canvas.height) * -2 + 1;  
}
 
function _clearPickPosition() {
  pickPosition.x = -100000;
  pickPosition.y = -100000;
}



class InteractionState { 
    constructor(mousePosition, clickedOnPoint=null, 
                rotateAroundAxis=null, clickedOnFace=null, 
                clickedOnFacePlane=null, dragDir=null) { 
        this.mousePosition = mousePosition; 
        this.clickedOnPoint = clickedOnPoint; 
        this.rotateAroundAxis = rotateAroundAxis; 
        this.clickedOnFace = clickedOnFace;  
        this.clickedOnFacePlane = clickedOnFacePlane; 
        this.dragDir = dragDir; 
    }
}

class UserInteractionStateMachine {
    constructor(state) { 
        this.hovering = true; 
        this.clicking = false; 
        this.dragging = false; 
        this.animating = false; 
        this.stopped = false; 
        this.interactionState = state; 
    }

    wipeOldState() { 
        Object.entries(this).forEach(([key, value]) => { 
            if (value) { 
                this.key = false; 
            }
        }); 
    }

    update(state) { 
        switch (action) { 
            case "hovering":
                this.wipeOldState(); 
                this.hovering = true; 
            case "clicking":
                this.wipeOldState(); 
                this.clicking = true; 
            case "dragging": 
                this.wipeOldState(); 
                this.dragging = true; 
            case "animating": 
                this.wipeOldState(); 
                this.animating = true;  
            case "mouseup": 
                this.wipeOldState(); 
                this.stopped = true; 
            default:
                return;
        }
        this.interactionState = state; 
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
            if (!intersectedObjects[0].face) return;
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

class ThreeScene {
    constructor() { 
        this.scene = new THREE.Scene(); 
        this.camera = new THREE.PerspectiveCamera(30, 
            window.innerWidth / window.innerHeight); 
        this.renderer = new THREE.WebGLRenderer({ antialias: true }); 
        this.ambientLight = new THREE.AmbientLight('white', 1); 
        this.light = new THREE.DirectionalLight('white', 1); 
        this.canvas = this.renderer.domElement; 
        this.time = 1; 
    }

    init(bg, cam, camLayer) { 
        //this.scene.position.set(3, 5, 3);
        this.scene.background = new THREE.Color(bg);
        this.scene.add(this.ambientLight); 
        this.camera.position.set(cam.x, cam.y, cam.z); 
        this.camera.lookAt(this.scene.position); 
        this.camera.layers.enable(camLayer); 
        // let there be light
        this.light.position.set(1, 1, 1); 
        this.scene.add(this.light); 
        this.renderer.setSize(window.innerWidth, window.innerHeight); 
        document.body.appendChild(this.renderer.domElement); 
    }
}

class RubiksCube { 
    // only 3x3 supported
    constructor(texture) { 
        this.NUM_CUBELETS = 27;  
        this.NUM_CUBELETS_PER_ROW = 3; 
        this.CUBELET_SIZE = 1/3;  
        this.FACE_COLORS = ["#FF0000",
                            "#FF6400",
                            "#FFFF00",
                            "#00BB00",
                            "#0000BB",
                            "#FFFFFF", 
                            "#000000"]; 
        this.loader = new THREE.TextureLoader(); 
        this.texture = this.loader.load(texture); 
    }

    visualize(scene) {
        //TODO handle non 3x3 cubes
        var cube = new THREE.Group();

        for (let i = 0; i < this.NUM_CUBELETS_PER_ROW; i++) {
            for (let j = 0; j < this.NUM_CUBELETS_PER_ROW; j++) {
                for (let k = 0; k < this.NUM_CUBELETS_PER_ROW; k++) {

                    var cubelet = new THREE.Mesh(
                        new THREE.BoxGeometry(this.CUBELET_SIZE, this.CUBELET_SIZE, this.CUBELET_SIZE),
                        [
                            new THREE.MeshPhongMaterial({ color: this.FACE_COLORS[0], alphaTest: 0.5 }),
                            new THREE.MeshPhongMaterial({ color: this.FACE_COLORS[1], alphaTest: 0.5 }),
                            new THREE.MeshPhongMaterial({ color: this.FACE_COLORS[2], alphaTest: 0.5 }),
                            new THREE.MeshPhongMaterial({ color: this.FACE_COLORS[3], alphaTest: 0.5 }),
                            new THREE.MeshPhongMaterial({ color: this.FACE_COLORS[4], alphaTest: 0.5 }),
                            new THREE.MeshPhongMaterial({ color: this.FACE_COLORS[5], alphaTest: 0.5 }),
                        ]
                    );

                    cubelet.position.x += i / this.NUM_CUBELETS_PER_ROW;
                    cubelet.position.y += j / this.NUM_CUBELETS_PER_ROW;
                    cubelet.position.z += k / this.NUM_CUBELETS_PER_ROW;
                    cubelet.rubikPosition = cubelet.position.clone(); 

                    cubelet.name = `cubelet_${i}${j}${k}`;
                    let edgeLord = new THREE.BoxGeometry(this.CUBELET_SIZE, this.CUBELET_SIZE, this.CUBELET_SIZE); 
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
                }
            }
        }
        scene.add(cube); 
    }

    rotate(cube, clickedCubelet) { 

    }
}


/*  EVENT LISTENERS  
    WHAT IS OUR PURPOSE IN LIFE? 
    WE LISTEN FOR EVENTS! 
*/ 

window.addEventListener('mousedown', (e) => { 

_setPickPosition(e);});

window.addEventListener('mouseup', _clearPickPosition);

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
window.addEventListener('mouseleave', _clearPickPosition);

window.addEventListener('touchstart', (event) => { 
    event.preventDefault(); 
    _setPickPosition(event.touches[0]); 
}, {passive: false}); 
window.addEventListener('touchmove', (event) => { 
    _setPickPosition(event.touches[0]); 
}); 
window.addEventListener('touchend', _clearPickPosition); 

/*   DRIVER CODE   */

let rubiks = new ThreeScene(); 
let cameraPosition = new THREE.Vector3(3,5,3); 
rubiks.init('Black', cameraPosition, 1); 
canvas = rubiks.canvas; 

let cube = new RubiksCube();
cube.visualize(rubiks.scene); 


_clearPickPosition();

const pickHelper = new PickHelper();

function animate() {
    rubiks.time *= 0.001;
    pickHelper.pick(pickPosition, rubiks.scene, rubiks.camera, rubiks.time); 
    rubiks.renderer.render(rubiks.scene, rubiks.camera);
}

if (debug) { 
    // X == red, Y == green, Z == blue
    const axesHelper = new THREE.AxesHelper(5); rubiks.scene.add(axesHelper);
}

rubiks.renderer.setAnimationLoop(animate); 
