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