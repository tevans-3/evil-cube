import * as evil from './evil/api.js';
import * as THREE from 'three';

// CITATIONS 
//
// 1. THREE.js documentation 
// 2. https://github.com/joews/rubik-js/blob/master/rubik.rubik-js 
// 3. https://cs.stanford.edu/people/karpathy/reinforcejs/
// 4. Asked Claude Opus 4.8 (browser chat) some debugging and conceptual questions (OOP refactor, rotation math and APIs)

let canvas;  

const debug = true; 

var state = new evil.InteractionState();
var stateMachine = new evil.UserInteractionStateMachine(); 

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

function _setMousePosition(event) { 
    const pos = _getCanvasRelativePosition(event);
    evil.mousePosition.x = (pos.x / canvas.width) * 2 - 1;
    evil.mousePosition.y = (pos.y / canvas.height) * -2 + 1;
}

function _clearMousePosition() { 
    evil.mousePosition.x = -100000;
    evil.mousePosition.y = -100000;
}

function _dragAngle(d) { 
    let k = (Math.PI / 2) * 3; 
    return d * k; 
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
    rubiks.renderer.render(rubiks.scene, rubiks.camera);
}

if (debug) { 
    // X == red, Y == green, Z == blue
    const axesHelper = new THREE.AxesHelper(5); rubiks.scene.add(axesHelper);
}

rubiks.renderer.setAnimationLoop(animate); 

function gestureMoveLogic(e, touched = false) {
    if (!stateMachine.picked && !stateMachine.dragging) return;

    if (touched) _setPickPosition(e.touches[0]);
    else _setPickPosition(e); 

    // need to cast a ray to intersect the clicked on face plane in order 
    // to compute the currentDragWorld, the drag in world space
    evil.mouseMoveRaycaster.layers.set(0);
    evil.mouseMoveRaycaster.setFromCamera(evil.pickPosition, rubiks.camera);
    const intersectionPoint = new THREE.Vector3();
    const result = evil.mouseMoveRaycaster.ray.intersectPlane(state.clickedOnFacePlane, intersectionPoint);
    
    if (!result) return;
    const currentDragWorld = intersectionPoint.clone().sub(state.clickedOnPoint);

    // this only executes once per gesture (well, it should)
    if (stateMachine.picked) {

        // these magic numbers correspond to a fraction of cube size
        // basically we want to only transition from PICKED -> DRAGGING
        // when the gesture has dragged a reasonable distance, which
        // prevents arbitrarily small drag distances from triggering a state 
        // change; 1/3 should be replaced with an exported global in ./shared.js 
        if (currentDragWorld.length() < 1 / 3 / 3) {
            _clearPickPosition(e);
            return;
        }

        // if our ray intersected the clicked on face plane 
        if (result) {
            // the current cursor position in 3D world space 
            state.dragEndPoint = intersectionPoint;
            // the current drag, difference between the current cursor position and 
            // the hit point 
            const dragWorld = state.dragEndPoint.clone().sub(state.clickedOnPoint);

            let axes = [new THREE.Vector3(1, 0, 0),
                        new THREE.Vector3(0, 1, 0),
                        new THREE.Vector3(0, 0, 1)];
            let names = ['x', 'y', 'z'];
            let inPlaneAxes = axes.filter((_, i) => names[i] !== state.normalAxis);

            // want to compute the axis that's closest to the drag vector
            let best = null, bestDot = 0;
            for (const axis of inPlaneAxes) {
                let d = dragWorld.dot(axis);
                if (Math.abs(d) > Math.abs(bestDot)) { bestDot = d; best = axis; }
            }

            state.dragDir = best.clone().multiplyScalar(Math.sign(bestDot));
            let tempRotationAxis = state.worldNormal.clone().cross(state.dragDir);

            // this switch cleans up dust which accumulates from repeated cross products
            // the principal component won't return a clean axis vector, so we have to 
            // map it ourselves
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

            // fix the sign of the rotation axis 
            state.rotateAroundAxis.multiplyScalar(Math.sign(tempRotationAxis[argmax]));

            // selecting the layer to rotate by picking the cubelets which are within 
            // a small threshold of the rotation axis 
            state.layerToRotate = cube.children.filter(cubelet =>
                Math.abs(cubelet.rubikPosition.dot(state.rotateAroundAxis)
                    - state.clickedOnCubeletPosition.dot(state.rotateAroundAxis)) < 1e-6);

            // have to attach the cubelets to a pivot parent object, whose only 
            // purpose in life is to rotate cubelet layers 
            pivot = new THREE.Object3D();
            pivot.position.copy(evil.center);
            rubiks.scene.add(pivot);
            state.layerToRotate.forEach(cubelet => pivot.attach(cubelet));

            // convert the drag vector to a scalar representing distance of drag
            // the dot product takes the drag direction vector and applies it to the 
            // current drag vector to get a scalar distance 
            state.dragDistance = currentDragWorld.dot(state.dragDir);
            stateMachine.update("dragging");
        }
    } 
    else if (stateMachine.dragging) {
        if (result) {
            state.dragDistance = currentDragWorld.dot(state.dragDir); 
            let angle = _dragAngle(state.dragDistance);
            // rotate just the pivot
            // can't mutate the rubikPosition attributes on the cubelets
            // the drag rotation is just a move preview 
            const q = new THREE.Quaternion().setFromAxisAngle(state.rotateAroundAxis, angle);
            pivot.quaternion.copy(q);
            pivot.updateMatrixWorld(true);
        }
    }
}

function gestureDownLogic(e, touched = false) {
    if (touched) _setPickPosition(e.touches[0]);
    else _setPickPosition(e); 
    let picked = pickHelper.pick(evil.pickPosition, rubiks.scene, rubiks.camera, rubiks.time, state);
    if (picked) { stateMachine.update("picked"); }
}

function gestureUpLogic(e, touched = false) {  
    stateMachine.update("hovering");
    if (touched) _setPickPosition(e.touches[0]);
    else _setPickPosition(e); 
    if (!state.layerToRotate) {
        state.reset(); return;
    }
    const turns = Math.round(_dragAngle(state.dragDistance) / (Math.PI / 2));
    const angle = turns * (Math.PI / 2);
    const q = new THREE.Quaternion().setFromAxisAngle(state.rotateAroundAxis, angle);
    state.layerToRotate.forEach(c => c.rubikPosition.sub(evil.center).applyQuaternion(q).add(evil.center));
    let grid = [0, 1 / 3, 2 / 3];
    // need to snap the cubelets back to their proper coordinates in the cube lattice 
    const snap = v => grid.reduce((b, g) =>
        Math.abs(v - g) < Math.abs(v - b) ? g : b);
    state.layerToRotate.forEach(cubelet => cubelet
        .rubikPosition
        .set(
            snap(cubelet.rubikPosition.x),
            snap(cubelet.rubikPosition.y),
            snap(cubelet.rubikPosition.z)
        )
    );
    pivot.quaternion.copy(q);
    state.layerToRotate.forEach(cubelet => cube.attach(cubelet));
    rubiks.scene.remove(pivot);
    _clearPickPosition(e);
    state.reset();
}

/*  WE ARE EVENT LISTENERS!

    WHAT IS OUR PURPOSE IN LIFE? 
    LISTENING FOR EVENTS! 

    WHAT IS OUR SATISFACTION IN LIFE? 
    LISTENING FOR EVENTS! 

    WE KNOW NOTHING SAVE THE MAGNIFICENCE OF THIS MIGHTY MISSION!
    LISTENING FOR EVENTS!
*/
let pivot; 
window.addEventListener('mousedown', (e) => {
    gestureDownLogic(e); 
});

window.addEventListener('mousemove', (e) => {
    gestureMoveLogic(e);  
});

window.addEventListener('mouseup', (e) => {
    gestureUpLogic(e); 
});

window.addEventListener('mouseleave', _clearPickPosition);

window.addEventListener('touchstart', (event) => {
    event.preventDefault();
    gestureDownLogic(event, touched = true); 
}, { passive: false });

window.addEventListener('touchmove', (event) => {
    event.preventDefault();
    gestureMoveLogic(event, touched = true); 
});

window.addEventListener('touchend', (e) => {
    e.preventDefault();
    gestureUpLogic(e, touched = true);
}); 
