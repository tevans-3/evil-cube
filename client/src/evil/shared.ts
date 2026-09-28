import * as THREE from 'three';

export const DATABASE_FILE = 'cpdb.bin'; 
export const testMode = 0;
export const LAYER_ID = {
    '["cubelet_020","cubelet_021","cubelet_022","cubelet_120","cubelet_121","cubelet_122","cubelet_220","cubelet_221","cubelet_222"]': 0,
    '["cubelet_000","cubelet_001","cubelet_002","cubelet_100","cubelet_101","cubelet_102","cubelet_200","cubelet_201","cubelet_202"]': 1,
    '["cubelet_200","cubelet_201","cubelet_202","cubelet_210","cubelet_211","cubelet_212","cubelet_220","cubelet_221","cubelet_222"]': 2,
    '["cubelet_000","cubelet_001","cubelet_002","cubelet_010","cubelet_011","cubelet_012","cubelet_020","cubelet_021","cubelet_022"]': 3,
    '["cubelet_002","cubelet_012","cubelet_022","cubelet_102","cubelet_112","cubelet_122","cubelet_202","cubelet_212","cubelet_222"]': 4,
    '["cubelet_000","cubelet_010","cubelet_020","cubelet_100","cubelet_110","cubelet_120","cubelet_200","cubelet_210","cubelet_220"]': 5,
};
export const LAYER_BY_AXIS: Record<evil.Axis, [max: number, min: number]> = { 
    y: [0, 1], 
    x: [2, 3], 
    z: [4, 5], 
}; 

export type Axis = 'x' | 'y' | 'z'; 
export const SAFE_AXIS: Record<number, Axis> = {
    0: 'y',
    1: 'y', 
    2: 'x', 
    3: 'x', 
    4: 'z', 
    5: 'z',
    6: 'y', 
    7: 'x', 
    8: 'z', 
}; 
export function axisToVector(axis: Axis) { 
    switch (axis) { 
        case 'x':  
            return new THREE.Vector3(1, 0, 0); 
        case 'y': 
            return new THREE.Vector3(0, 1, 0); 
        case 'z': 
            return new THREE.Vector3(0, 0, 1); 
    }
}
export const MIDDLE_LAYER: Record<evil.Axis, number> = { 'y': 6, 'x': 7, 'z': 8 }; 
export const PLUS_ONE_IS_BASE = [true, true, false, true, false, true, true, true, false];
export const MOVE_NAMES = {
    "1, 1.570796, x, 0": "U",
    "1, 1.570796, z, 0": "U",
    "-1, 1.570796, x, 0": "U'",
    "-1, 1.570796, z, 0": "U'",
    "1, 4.712389, x, 0": "U'",
    "1, 4.712389, z, 0": "U'",
    "-1, 4.712389, x, 0": "U",
    "-1, 4.712389, z, 0": "U",
    "1, 3.141593, x, 0": "U2",
    "1, 3.141593, z, 0": "U2",
    "-1, 3.141593, x, 0": "U2",
    "-1, 3.141593, z, 0": "U2",

    "1, 1.570796, x, 1": "D",
    "1, 1.570796, z, 1": "D",
    "-1, 1.570796, x, 1": "D'",
    "-1, 1.570796, z, 1": "D'",
    "1, 4.712389, x, 1": "D'",
    "1, 4.712389, z, 1": "D'",
    "-1, 4.712389, x, 1": "D",
    "-1, 4.712389, z, 1": "D",
    "1, 3.141593, x, 1": "D2",
    "1, 3.141593, z, 1": "D2",
    "-1, 3.141593, x, 1": "D2",
    "-1, 3.141593, z, 1": "D2",

    "-1, 1.570796, y, 2": "R",
    "-1, 1.570796, z, 2": "R",
    "1, 1.570796, y, 2": "R'",
    "1, 1.570796, z, 2": "R'",
    "-1, 4.712389, y, 2": "R'",
    "-1, 4.712389, z, 2": "R'",
    "1, 4.712389, y, 2": "R",
    "1, 4.712389, z, 2": "R",
    "-1, 3.141593, y, 2": "R2",
    "-1, 3.141593, z, 2": "R2",
    "1, 3.141593, y, 2": "R2",
    "1, 3.141593, z, 2": "R2",

    "1, 1.570796, y, 3": "L",
    "1, 1.570796, z, 3": "L",
    "-1, 1.570796, y, 3": "L'",
    "-1, 1.570796, z, 3": "L'",
    "1, 4.712389, y, 3": "L'",
    "1, 4.712389, z, 3": "L'",
    "-1, 4.712389, y, 3": "L",
    "-1, 4.712389, z, 3": "L",
    "1, 3.141593, y, 3": "L2",
    "1, 3.141593, z, 3": "L2",
    "-1, 3.141593, y, 3": "L2",
    "-1, 3.141593, z, 3": "L2",

    "-1, 1.570796, x, 4": "F",
    "-1, 1.570796, y, 4": "F",
    "1, 1.570796, x, 4": "F'",
    "1, 1.570796, y, 4": "F'",
    "-1, 4.712389, x, 4": "F'",
    "-1, 4.712389, y, 4": "F'",
    "1, 4.712389, x, 4": "F",
    "1, 4.712389, y, 4": "F",
    "-1, 3.141593, x, 4": "F2",
    "-1, 3.141593, y, 4": "F2",
    "1, 3.141593, x, 4": "F2",
    "1, 3.141593, y, 4": "F2",

    "1, 1.570796, x, 5": "B",
    "1, 1.570796, y, 5": "B",
    "-1, 1.570796, x, 5": "B'",
    "-1, 1.570796, y, 5": "B'",
    "1, 4.712389, x, 5": "B'",
    "1, 4.712389, y, 5": "B'",
    "-1, 4.712389, x, 5": "B",
    "-1, 4.712389, y, 5": "B",
    "1, 3.141593, x, 5": "B2",
    "1, 3.141593, y, 5": "B2",
    "-1, 3.141593, x, 5": "B2",
    "-1, 3.141593, y, 5": "B2",

    "1, 1.570796, x, 6": "E",
    "1, 1.570796, z, 6": "E",
    "-1, 1.570796, x, 6": "E'",
    "-1, 1.570796, z, 6": "E'",
    "1, 4.712389, x, 6": "E'",
    "1, 4.712389, z, 6": "E'",
    "-1, 4.712389, x, 6": "E",
    "-1, 4.712389, z, 6": "E",
    "1, 3.141593, x, 6": "E2",
    "1, 3.141593, z, 6": "E2",
    "-1, 3.141593, x, 6": "E2",
    "-1, 3.141593, z, 6": "E2",

    "1, 1.570796, y, 7": "M",
    "1, 1.570796, z, 7": "M",
    "-1, 1.570796, y, 7": "M'",
    "-1, 1.570796, z, 7": "M'",
    "1, 4.712389, y, 7": "M'",
    "1, 4.712389, z, 7": "M'",
    "-1, 4.712389, y, 7": "M",
    "-1, 4.712389, z, 7": "M",
    "1, 3.141593, y, 7": "M2",
    "1, 3.141593, z, 7": "M2",
    "-1, 3.141593, y, 7": "M2",
    "-1, 3.141593, z, 7": "M2",

    "-1, 1.570796, x, 8": "S",
    "-1, 1.570796, y, 8": "S",
    "1, 1.570796, x, 8": "S'",
    "1, 1.570796, y, 8": "S'",
    "-1, 4.712389, x, 8": "S'",
    "-1, 4.712389, y, 8": "S'",
    "1, 4.712389, x, 8": "S",
    "1, 4.712389, y, 8": "S",
    "-1, 3.141593, x, 8": "S2",
    "-1, 3.141593, y, 8": "S2",
    "1, 3.141593, x, 8": "S2",
    "1, 3.141593, y, 8": "S2",
};
export const MOVES = {
    "U":  { cp: [0, 1, 3, 7, 4, 5, 2, 6], co: [0, 0, 0, 0, 0, 0, 0, 0] },
    "U2": { cp: [0, 1, 7, 6, 4, 5, 3, 2], co: [0, 0, 0, 0, 0, 0, 0, 0] },
    "U'": { cp: [0, 1, 6, 2, 4, 5, 7, 3], co: [0, 0, 0, 0, 0, 0, 0, 0] },
    "D":  { cp: [1, 5, 2, 3, 0, 4, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },
    "D2": { cp: [5, 4, 2, 3, 1, 0, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },
    "D'": { cp: [4, 0, 2, 3, 5, 1, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },
    "R":  { cp: [0, 1, 2, 3, 6, 4, 7, 5], co: [0, 0, 0, 0, 1, 2, 2, 1] },
    "R2": { cp: [0, 1, 2, 3, 7, 6, 5, 4], co: [0, 0, 0, 0, 0, 0, 0, 0] },
    "R'": { cp: [0, 1, 2, 3, 5, 7, 4, 6], co: [0, 0, 0, 0, 1, 2, 2, 1] },
    "L":  { cp: [2, 0, 3, 1, 4, 5, 6, 7], co: [2, 1, 1, 2, 0, 0, 0, 0] },
    "L2": { cp: [3, 2, 1, 0, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },
    "L'": { cp: [1, 3, 0, 2, 4, 5, 6, 7], co: [2, 1, 1, 2, 0, 0, 0, 0] },
    "F":  { cp: [0, 5, 2, 1, 4, 7, 6, 3], co: [0, 2, 0, 1, 0, 1, 0, 2] },
    "F2": { cp: [0, 7, 2, 5, 4, 3, 6, 1], co: [0, 0, 0, 0, 0, 0, 0, 0] },
    "F'": { cp: [0, 3, 2, 7, 4, 1, 6, 5], co: [0, 2, 0, 1, 0, 1, 0, 2] },
    "B":  { cp: [4, 1, 0, 3, 6, 5, 2, 7], co: [1, 0, 2, 0, 2, 0, 1, 0] },
    "B2": { cp: [6, 1, 4, 3, 2, 5, 0, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },
    "B'": { cp: [2, 1, 6, 3, 0, 5, 4, 7], co: [1, 0, 2, 0, 2, 0, 1, 0] }, 
    "E":  { cp: [0, 1, 2, 3, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },
    "E2": { cp: [0, 1, 2, 3, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },
    "E'": { cp: [0, 1, 2, 3, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },
    "M":  { cp: [0, 1, 2, 3, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },
    "M2": { cp: [0, 1, 2, 3, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },
    "M'": { cp: [0, 1, 2, 3, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },
    "S":  { cp: [0, 1, 2, 3, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },
    "S2": { cp: [0, 1, 2, 3, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },
    "S'": { cp: [0, 1, 2, 3, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },
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
    pickPosition.x = -10000;
    pickPosition.y = -10000;
}
export function _setPickPositionWrapper(e: MouseEvent | TouchEvent, touched: boolean, canvas: HTMLCanvasElement) {
    if (touched) { 
        const touch = (e as TouchEvent).touches[0] || (e as TouchEvent).changedTouches[0];
        _setPickPosition(touch, canvas); 
    }
    else _setPickPosition(e as MouseEvent, canvas);
}
export function _handleWindowResize(camera: any, renderer: any) {  
    camera.aspect = window.innerWidth / window.innerHeight; 
    camera.updateProjectionMatrix(); 
    renderer.setSize(window.innerWidth, window.innerHeight); 
} 


