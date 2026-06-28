import * as THREE from 'three';

export const LAYER_ID = {
    '["cubelet_020","cubelet_021","cubelet_022","cubelet_120","cubelet_121","cubelet_122","cubelet_220","cubelet_221","cubelet_222"]': 0,
    '["cubelet_000","cubelet_001","cubelet_002","cubelet_100","cubelet_101","cubelet_102","cubelet_200","cubelet_201","cubelet_202"]': 1,
    '["cubelet_200","cubelet_201","cubelet_202","cubelet_210","cubelet_211","cubelet_212","cubelet_220","cubelet_221","cubelet_222"]': 2,
    '["cubelet_000","cubelet_001","cubelet_002","cubelet_010","cubelet_011","cubelet_012","cubelet_020","cubelet_021","cubelet_022"]': 3,
    '["cubelet_002","cubelet_012","cubelet_022","cubelet_102","cubelet_112","cubelet_122","cubelet_202","cubelet_212","cubelet_222"]': 4,
    '["cubelet_000","cubelet_010","cubelet_020","cubelet_100","cubelet_110","cubelet_120","cubelet_200","cubelet_210","cubelet_220"]': 5,
};

// key format: "sign, angle, [axisA,axisB], layer"
// pi/2 ? 1.570796 · pi ? 3.141593 · 3pi/2 ? 4.712389 · 2pi ? 6.283185
export const MOVES = {
    "1, 1.570796, x, 0": "U",
    "1, 1.570796, z, 0": "U",
    "-1, 1.570796, x, 0": "U'",
    "-1, 1.570796, z, 0": "U'",
    "1, 4.712389, x, 0": "U'",
    "1, 4.712389, z, 0": "U'",
    "1, 3.141593, x, 0": "U2",
    "1, 3.141593, z, 0": "U2",
    "1, 1.570796, x, 1": "D",
    "1, 1.570796, z, 1": "D",
    "-1, 1.570796, x, 1": "D'",
    "-1, 1.570796, z, 1": "D'",
    "1, 4.712389, x, 1": "D'",
    "1, 4.712389, z, 1": "D'",
    "1, 3.141593, x, 1": "D2",
    "1, 3.141593, z, 1": "D2",
    "-1, 1.570796, y, 2": "R",
    "-1, 1.570796, z, 2": "R",
    "1, 1.570796, y, 2": "R'",
    "1, 1.570796, z, 2": "R'",
    "-1, 4.712389, y, 2": "R'",
    "-1, 4.712389, z, 2": "R'",
    "-1, 3.141593, y, 2": "R2",
    "-1, 3.141593, z, 2": "R2",
    "1, 1.570796, y, 3": "L",
    "1, 1.570796, z, 3": "L",
    "-1, 1.570796, y, 3": "L'",
    "-1, 1.570796, z, 3": "L'",
    "1, 4.712389, y, 3": "L'",
    "1, 4.712389, z, 3": "L'",
    "1, 3.141593, y, 3": "L2",
    "1, 3.141593, z, 3": "L2",
    "-1, 1.570796, x, 4": "F",
    "-1, 1.570796, y, 4": "F",
    "1, 1.570796, x, 4": "F'",
    "1, 1.570796, y, 4": "F'",
    "-1, 4.712389, x, 4": "F'",
    "-1, 4.712389, y, 4": "F'",
    "-1, 3.141593, x, 4": "F2",
    "-1, 3.141593, y, 4": "F2",
    "1, 1.570796, x, 5": "B",
    "1, 1.570796, y, 5": "B",
    "-1, 1.570796, x, 5": "B'",
    "-1, 1.570796, y, 5": "B'",
    "1, 4.712389, x, 5": "B'",
    "1, 4.712389, y, 5": "B'",
    "1, 3.141593, x, 5": "B2",
    "1, 3.141593, y, 5": "B2",
};

export const MOVE_INDEXES = {
    "U":  0, 
    "U2": 1, 
    "U'": 2, 
    "D":  3, 
    "D2": 4, 
    "D'": 5, 
    "R":  6, 
    "R2": 7, 
    "R'": 8, 
    "L":  9, 
    "L2": 10, 
    "L'": 11, 
    "F":  12, 
    "F2": 13, 
    "F'": 14, 
    "B":  15, 
    "B2": 16, 
    "B'": 17
}; 

export var mousePosition = { x: 0, y: 0 };

export var pickPosition = { x: 0, y: 0 };
export function _principalComponent(v: any) {
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

export const mouseMoveRaycaster = new THREE.Raycaster();

export const center = new THREE.Vector3(1 / 3, 1 / 3, 1 / 3);

export function _getCanvasRelativePosition(event: MouseEvent | Touch, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * canvas.width / rect.width,
        y: (event.clientY - rect.top) * canvas.height / rect.height,
    };
}
export function _setPickPosition(event: MouseEvent | Touch, canvas: HTMLCanvasElement) {
    const pos = _getCanvasRelativePosition(event, canvas);
    pickPosition.x = (pos.x / canvas.width) * 2 - 1;
    pickPosition.y = (pos.y / canvas.height) * -2 + 1;
}
export function _clearPickPosition() {
    pickPosition.x = -100000;
    pickPosition.y = -100000;
}
export function _setPickPositionWrapper(e: MouseEvent | TouchEvent, touched: boolean, canvas: HTMLCanvasElement) {
    if (touched) _setPickPosition((e as TouchEvent).touches[0], canvas);
    else _setPickPosition(e as MouseEvent, canvas);
}