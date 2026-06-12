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
// 4. Asked Claude (browser chat) some debugging and conceptual questions (OOP refactor, rotation math and APIs)

let canvas;  
const mousePosition = {x: 0, y: 0};
var mouseMoveDirection = ''; 

const debug = true; 

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


/*  WE ARE EVENT LISTENERS!

    WHAT IS OUR PURPOSE IN LIFE? 
    LISTENING FOR EVENTS! 

    WHAT IS OUR SATISFACTION IN LIFE? 
    LISTENING FOR EVENTS! 

    WE KNOW NOTHING SAVE THE MAGNIFICENCE OF THIS MIGHTY MISSION!
    LISTENING FOR EVENTS!
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

let rubiks = new evil.ThreeScene(); 
let cameraPosition = new THREE.Vector3(3,5,3); 
rubiks.init('Black', cameraPosition, 1); 
canvas = rubiks.canvas; 

let cube = new evil.RubiksCube();
cube.visualize(rubiks.scene); 


_clearPickPosition();

const pickHelper = new evil.PickHelper();

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
