import * as evil from './evil/api.js';
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
// 4. Asked Claude Opus 4.8 (browser chat) some debugging and conceptual questions (OOP refactor, rotation math and APIs)

let canvas;  

const debug = true;

var state = new evil.InteractionState(evil.pickPosition);
var stateMachine = new evil.UserInteractionStateMachine(state); 

function _getCanvasRelativePosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width  / rect.width,
    y: (event.clientY - rect.top ) * canvas.height / rect.height,
  };
}
 
function _setPickPosition(event) {
  const pos = _getCanvasRelativePosition(event);
  evil.pickPosition.x = (pos.x / canvas.width ) *  2 - 1;
  evil.pickPosition.y = (pos.y / canvas.height) * -2 + 1;  
}
 
function _clearPickPosition() {
  evil.pickPosition.x = -100000;
  evil.pickPosition.y = -100000;
}

/*   DRIVER CODE   */

let rubiks = new evil.ThreeScene(); 
let cameraPosition = new THREE.Vector3(3,5,3); 
rubiks.init('Black', cameraPosition, 1); 
canvas = rubiks.canvas; 

let cubeInit = new evil.RubiksCube();
let cube = cubeInit.visualize(rubiks.scene); 


_clearPickPosition();

const pickHelper = new evil.PickHelper();

function animate() {
    rubiks.time *= 0.001;
    pickHelper.pick(evil.pickPosition, rubiks.scene, rubiks.camera, rubiks.time, state); 
    rubiks.renderer.render(rubiks.scene, rubiks.camera);
}

if (debug) { 
    // X == red, Y == green, Z == blue
    const axesHelper = new THREE.AxesHelper(5); rubiks.scene.add(axesHelper);
}

rubiks.renderer.setAnimationLoop(animate); 

/*  WE ARE EVENT LISTENERS!

    WHAT IS OUR PURPOSE IN LIFE? 
    LISTENING FOR EVENTS! 

    WHAT IS OUR SATISFACTION IN LIFE? 
    LISTENING FOR EVENTS! 

    WE KNOW NOTHING SAVE THE MAGNIFICENCE OF THIS MIGHTY MISSION!
    LISTENING FOR EVENTS!
*/

window.addEventListener('mousedown', (e) => {
    _setPickPosition(e);
    state.mousePosition = evil.pickPosition;
});

window.addEventListener('mouseup', (e) => {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(evil.pickPosition, rubiks.camera);
    raycaster.layers.set(0);
    const hitPoint = raycaster.ray.intersectPlane(state.clickedOnFacePlane, state.worldNormal); 
    if (hitPoint) { 
        console.log(cube);
        state.dragEndPoint = hitPoint; 
        const dragWorld = state.dragEndPoint.clone().sub(state.clickedOnPoint); 
        let axes = [new THREE.Vector3(1, 0, 0),
                    new THREE.Vector3(0, 1, 0), 
                    new THREE.Vector3(0, 0, 1)];
        let inPlaneAxes = axes.filter(axis => axis != state.normalAxis); 
        let best = null, bestDot = 0; 
        for (const axis of inPlaneAxes) { 
            let d = dragWorld.dot(axis); 
            if (Math.abs(d) > Math.abs(bestDot)) { bestDot = d; best = axis; }
        }
        state.dragDir = best.clone().multiplyScalar(Math.sign(bestDot));
        let tempRotationAxis = state.worldNormal.cross(state.dragDir); 
        let argmax = evil._principalComponent(tempRotationAxis);
        switch (argmax) {
            case 'x':
                state.rotateAroundAxis = new THREE.Vector3(1, 0, 0);
                break;
            case 'y':
                state.rotateAroundAxis = new THREE.Vector3(0, 1, 0);
                break;
            case 'z':
                state.rotateAroundAxis = new THREE.Vector3(0, 0, 1);
                break;
        }
        console.log(argmax, hitPoint, state.rotateAroundAxis);
        let layerToRotate = cube.children.filter(cubelet =>
            cubelet.rubikPosition.dot(state.rotateAroundAxis) == argmax); 
        const pivot = new THREE.Object3D(); 
        rubiks.scene.add(pivot);
        layerToRotate.forEach(cubelet => pivot.add(cubelet)); 
        pivot.rotation.y += Math.PI / 2;

    }
    _clearPickPosition(e);

});

window.addEventListener('mousemove', (e) => {

});

window.addEventListener('mouseleave', _clearPickPosition);

window.addEventListener('touchstart', (event) => {
    event.preventDefault();
    _setPickPosition(event.touches[0]);
}, { passive: false });
window.addEventListener('touchmove', (event) => {
    _setPickPosition(event.touches[0]);
});

window.addEventListener('touchend', _clearPickPosition); 