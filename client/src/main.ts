import * as evil from './evil/api.ts';
import { Table } from './components/table.ts';
import { ReplayButton, replay } from './components/replay.ts';
import * as THREE from 'three';
import { DbConnection, tables } from '../module_bindings';
import { Identity, Timestamp } from 'spacetimedb';
import type * as Types from '../module_bindings/types';

// CITATIONS
//
// 1. THREE.js documentation
// 2. https://github.com/joews/rubik-js/blob/master/rubik.rubik-js
// 3. https://cs.stanford.edu/people/karpathy/reinforcejs/
// 4. Asked Claude Opus 4.8 (browser chat) some debugging and conceptual questions (OOP refactor, rotation math and APIs)
// 5. https://stackoverflow.com/questions/500221/how-would-you-represent-a-rubiks-cube-in-code\
// 6. SpacetimeDB documentation

/* DATA ACCESS */

/*const HOST = import.meta.env.SPACETIME_URI;
const AUTH_TOKEN = import.meta.env.SPACETIME_AUTH_TOKEN;
const DB_NAME = import.meta.env.SPACETIME_DB_NAME;

const conn = DbConnection.builder()
    .withUri(HOST)
    .withDatabaseName(DB_NAME)
    .onConnect((conn, identity, token) => {
        console.log(`Connected! Identity: ${identity.toHexString()}`);
        localStorage.setItem(AUTH_TOKEN, token);
        conn.subscriptionBuilder()
            .onApplied(ctx => {
                console.log(`Ready with ${ctx.db.cuber.count()} cubers`);

                const leaderboard = Table<Types.CuberView>(Array.from(ctx.db.top_scorers.iter()),
                    [{ header: "NAME",   cell: c => c.name },
                     { header: "SCORE",  cell: c => c.score.toString() }, 
                     { header: "REPLAY", cell: c => ReplayButton(c.singmaster, replay(c.singmaster))}
                    ], "leaderboard");
                document.body.append(leaderboard);
            })
            .subscribe([tables.cuber, "SELECT * FROM top_scorers"]);
    })
    .onConnectError((_ctx, error) => {
        console.error(`Connection failed:`, error);
    })
    .onDisconnect(() => {
        console.log(`Disconnected from SpacetimeDB`);
    })
    .build();

conn.db.cuber.onInsert((ctx, cuber) => {

}); 

conn.db.cuber.onDelete((ctx, cuber) => {

});

conn.db.cuber.onUpdate((ctx, cuber) => {

});*/

let canvas: HTMLCanvasElement;

const debug = false;

var state = new evil.InteractionState();
var stateMachine = new evil.UserInteractionStateMachine();

/*   DRIVER CODE   */

let rubiks = new evil.ThreeScene();
let cameraPosition = new THREE.Vector3(3, 5, 3);
rubiks.init('Black', cameraPosition, 1);

let cubeInit = new evil.RubiksCube("");
let cube = cubeInit.visualize(rubiks.scene);
canvas = rubiks.canvas;

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
            const dragWorld = engine.computeDragWorld(state, state.dragEndPoint); //state.dragEndPoint.clone().sub(state.clickedOnPoint);
            let inPlaneAxes = engine.computeInPlaneAxes(state);
            engine.computeDragDir(state, dragWorld, inPlaneAxes);
            engine.computeRotationAxis(state);
            engine.computeLayerToRotate(state, cube);
            engine.computeDragDist(state, currentDragWorld);

            //TODO refactor below 6 lines (140 - 147) to: rubiks.setUpPivot(state, evil.center, pivot);

            // have to attach the cubelets to a pivot parent object, whose only 
            // purpose in life is to rotate cubelet layers 
            pivot = new THREE.Object3D();
            pivot.position.copy(evil.center);
            rubiks.scene.add(pivot);

            state.layerToRotate.forEach((cubelet: evil.Cubelet) => pivot.attach(cubelet));
            stateMachine.update("dragging");
        }
    }
    else if (stateMachine.dragging) {
        if (result) {
            const q = engine.computePreviewQuaternion(state, currentDragWorld);
            pivot.quaternion.copy(q);
            pivot.updateMatrixWorld(true);
        }
    }
}

function gestureDownLogic(e: MouseEvent | TouchEvent, touched = false) {
    evil._setPickPositionWrapper(e, touched, canvas);
    let picked = pickHelper.pick(evil.pickPosition, rubiks.scene, rubiks.camera, rubiks.time, state);
    if (picked) {
        stateMachine.update("picked");
        rubiks.controls.enabled = false;
    }
}

function gestureUpLogic(e: MouseEvent | TouchEvent, touched = false) {
    stateMachine.update("hovering");
    // REFACTOR 5 LINES BELOW TO: rubiks.setUpScenePreRotation(state, e, touched, canvas);
    evil._setPickPositionWrapper(e, touched, canvas);
    rubiks.controls.enabled = true;
    if (!state.layerToRotate) {
        state.reset(); return;
    }
    const turns = engine.computeTurns(state);
    const angle = engine.computeAngle(turns);
    console.log(angle, turns);
    const q = engine.computeQuaternion(state, angle);
    state.layerToRotate.forEach((c: evil.Cubelet) => engine.computeQuaternionRotation(q, c, evil.center));
    engine.correctPositionsAfterRotation(state);

    // REFACTOR 5 LINES BELOW TO: rubiks.cleanUpSceneAfterRotation(state, q, cube, pivot);
    pivot.quaternion.copy(q);
    state.layerToRotate.forEach((cubelet: evil.Cubelet) => cube.attach(cubelet));
    rubiks.scene.remove(pivot);
    evil._clearPickPosition();
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