import * as THREE from 'three';

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