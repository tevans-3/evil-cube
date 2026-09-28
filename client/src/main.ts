import * as evil from './evil/api.ts';
import * as THREE from 'three';

// CITATIONS
//
// 1. THREE.js documentation
// 2. https://github.com/joews/rubik-js/blob/master/rubik.rubik-js
// 3. https://cs.stanford.edu/people/karpathy/reinforcejs/
// 4. Asked Claude Opus 4.8 and 5.5 (browser chat) some debugging and conceptual questions (OOP refactor, rotation math/logic and APIs)
// 5. https://stackoverflow.com/questions/500221/how-would-you-represent-a-rubiks-cube-in-code\

let canvas: HTMLCanvasElement;

const debug = false;

var state = new evil.InteractionState();
var stateMachine = new evil.UserInteractionStateMachine();

/*   DRIVER CODE   */
let rubiks = new evil.ThreeScene();
let cameraPosition = new THREE.Vector3(3, 5, 3);
rubiks.init('White', cameraPosition, 1);

let maxAnisotropy = rubiks.renderer.capabilities.getMaxAnisotropy(); 
let cubeInit = new evil.RubiksCube(maxAnisotropy);
let cube = cubeInit.visualize(rubiks.scene); 
let adversary = new evil.Adversary(); 
canvas = rubiks.canvas;
let scrambling = false; 
for (let i = 0; i < 5; i++) { 
    yeet(); 
} 
evil._clearPickPosition();

const pickHelper = new evil.PickHelper();

function animate() {
    rubiks.time = performance.now() * 0.001;
    rubiks.renderer.render(rubiks.scene, rubiks.camera);
}

if (debug) {
    // X == red, Y == green, Z == blue
    const axesHelper = new THREE.AxesHelper(5); rubiks.scene.add(axesHelper);
}

rubiks.renderer.setAnimationLoop(animate);

const engine = new evil.ComputationEngine();
function gestureMoveLogic(e: MouseEvent | TouchEvent, touched = false) {
    if (!stateMachine.picked && !stateMachine.dragging) return;
    if (scrambling) return; 

    evil._setPickPositionWrapper(e, touched, canvas);

    // need to cast a ray to intersect the clicked on face plane in order 
    // to compute the currentDragWorld, the drag in world space
    evil.mouseMoveRaycaster.layers.set(0);
    evil.mouseMoveRaycaster.setFromCamera(new THREE.Vector2(evil.pickPosition.x, evil.pickPosition.y), rubiks.camera);
    const intersectionPoint = new THREE.Vector3();
    const result = evil.mouseMoveRaycaster.ray.intersectPlane(state.clickedOnFacePlane, intersectionPoint);

    if (!result) return;
    const currentDragWorld = engine.computeDragWorld(state, intersectionPoint);
    // this only executes once per gesture (well, it should)
    if (stateMachine.picked) {

        // these magic numbers correspond to a fraction of cube size
        // basically we want to only transition from PICKED -> DRAGGING
        // when the gesture has dragged a reasonable distance, which
        // prevents arbitrarily small drag distances from triggering a state 
        // change; 1/3 should be replaced with an exported global in ./shared.js 
        if (currentDragWorld.length() < 1 / 3 / 3) {
            evil._clearPickPosition();
            return;
        }

        // if our ray intersected the clicked on face plane 
        if (result) {
            // the current cursor position in 3D world space 
            state.dragEndPoint = intersectionPoint;
            // the current drag, difference between the current cursor position and 
            // the hit point 
            const dragWorld = engine.computeDragWorld(state, state.dragEndPoint);
            let inPlaneAxes = engine.computeInPlaneAxes(state);
            engine.computeDragDir(state, dragWorld, inPlaneAxes);
            engine.computeRotationAxis(state);
            engine.computeLayerToRotate(state, cube);
            engine.computeDragDist(state, currentDragWorld);

            rubiks.setUpPivot(state, evil.center);
            stateMachine.update("dragging");
        }
    }
    else if (stateMachine.dragging) {
        if (result) {
            const q = engine.computePreviewQuaternion(state, currentDragWorld);
            rubiks.previewRotation(q);
        }
    }
}

function gestureDownLogic(e: MouseEvent | TouchEvent, touched = false, isScramble = false) { 
    if (scrambling) return; 
    evil._setPickPositionWrapper(e, touched, canvas);
    let picked = pickHelper.pick(evil.pickPosition, rubiks.scene, rubiks.camera, rubiks.time, state);
    if (picked) {
        stateMachine.update("picked");
        rubiks.controls.enabled = false;
    }
    if (isScramble) {} 
        // need to fake a picking event to trigger the movement pipeline 
        
}

let move = { };
function gestureUpLogic(e: MouseEvent | TouchEvent, touched = false) {
    if (!stateMachine.dragging) return;
    if (scrambling) return; 
    stateMachine.update("hovering");
    rubiks.setUpScenePreRotation(state, e, touched, canvas);
    const turns = engine.computeTurns(state);
    const angle = engine.computeAngle(turns);
    const q = engine.computeQuaternion(state, angle);
    state.layerToRotate.forEach((c: evil.Cubelet) => engine.computeQuaternionRotation(q, c, evil.center));
    rubiks.setUpScenePreRotation(state, e, touched, canvas);
    move = engine.computeMove(state, angle);
    engine.correctPositionsAfterRotation(state);
    rubiks.cleanUpSceneAfterRotation(state, q, cube);
    console.log(move);
    if (move) evil.cubeMoveTrigger.dispatchEvent(evil.cubeMoveEvent);
}

function inLayer(c: evil.Cubelet, layerIndex: number) { 
    const max = 2 / 3, eps = 1e-3, mid = 1 / 3; 
    const p = c.position;
    switch (layerIndex) { 
        case 0: return Math.abs(p.y - max) < eps;  
        case 1: return Math.abs(p.y) < eps; 
        case 2: return Math.abs(p.x - max) < eps; 
        case 3: return Math.abs(p.x) < eps; 
        case 4: return Math.abs(p.z - max) < eps; 
        case 5: return Math.abs(p.z) < eps;
        case 6: return Math.abs(p.y - mid) < eps; 
        case 7: return Math.abs(p.x - mid) < eps; 
        case 8: return Math.abs(p.z - mid) < eps; 
    }
    return false; 
}

function animateLayerTurn(angle: number, ms = 200): Promise<void> {
    return new Promise((resolve) => { 
        const start = performance.now(); 
        const step  = (now: number) => { 
            const t = Math.min((now - start) / ms, 1);
            const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
            rubiks.previewRotation(engine.computeQuaternion(state, angle*eased)); 
            if (t < 1) requestAnimationFrame(step); 
            else resolve(); 
        }; 
        requestAnimationFrame(step); 
    }); 
} 


async function scramble(e: Event) { 
    let layer_index = evil.getRandomInt(9);  
    let layer = Object.fromEntries( 
        Object.entries(evil.LAYER_ID).map(([layer, id]) => [id, layer])
    )[layer_index];
    let axis = evil.axisToVector(evil.SAFE_AXIS[layer_index]);
    state.reset(); 
    state.rotateAroundAxis = axis;
    state.layerToRotate = cube.children
        .filter(c => inLayer(c, layer_index)) as evil.Cubelet[];
    rubiks.setUpPivot(state, evil.center);
    rubiks.setUpScenePreRotation(state, true, false, canvas);
    const angle = Math.PI/2; 
    await animateLayerTurn(angle); 
    const q = engine.computeQuaternion(state, angle);
    state.layerToRotate.forEach((c: evil.Cubelet) => engine.computeQuaternionRotation(q, c, evil.center));
    engine.correctPositionsAfterRotation(state); 
    rubiks.cleanUpSceneAfterRotation(state, q, cube);
}
/*  WE ARE EVENT LISTENERS!

    WHAT IS OUR PURPOSE IN LIFE? 
    LISTENING FOR EVENTS! 

    WHAT IS OUR SATISFACTION IN LIFE? 
    LISTENING FOR EVENTS! 

    WE KNOW NOTHING SAVE THE MAGNIFICENCE OF THIS MIGHTY MISSION!
    LISTENING FOR EVENTS!
*/
let pivot: THREE.Object3D;
window.addEventListener('mousedown', (e) => {
    gestureDownLogic(e);
});

window.addEventListener('mousemove', (e) => {
    gestureMoveLogic(e);
});

window.addEventListener('mouseup', (e) => {
    gestureUpLogic(e);
});

window.addEventListener('mouseleave', evil._clearPickPosition);

window.addEventListener('touchstart', (event) => {
    event.preventDefault();
    gestureDownLogic(event, true);
}, { passive: false });

window.addEventListener('touchmove', (event) => {
    event.preventDefault();
    gestureMoveLogic(event, true);
});

window.addEventListener('touchend', (event) => {
    event.preventDefault();
    gestureUpLogic(event, true);
});

window.addEventListener('resize', (_) => { 
    evil._handleWindowResize(rubiks.camera, rubiks.renderer, window);  
}); 

evil.cubeMoveTrigger.addEventListener('cubeMove', (event) => { 
    console.log(event.detail);
    adversary.respond(move);  
}); 

evil.scrambleTrigger.addEventListener('cubeDeathWarrantSigned', (event) => { 
    console.log(event.detail); 
    // scramble cube
    yeet(event); 
});


async function yeet(e) { 
    if (scrambling) return; 
    scrambling = true; 
    rubiks.controls.enabled = false; 
    try { 
        for (let i = 0; i < 15; i ++) {
            await scramble(cube, e); 
        }
    } finally { 
        scrambling = false; 
        rubiks.controls.enabled = true; 
    } 
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)); 


