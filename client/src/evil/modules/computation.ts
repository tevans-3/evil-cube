import type { InteractionState, Cubelet } from ".";
import * as THREE from 'three';
export class ComputationEngine {
    constructor() {
        this.grid = [0, 1 / 3, 2 / 3];
        this.axes = [new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 1)];
        this.names = ['x', 'y', 'z'];
        this.snap = (v: number) => this.grid.reduce((b, g) =>
            Math.abs(v - g) < Math.abs(v - b) ? g : b);
    }

    computeDragAngle(d: number) {
        let k = (Math.PI / 2) * 3;
        return d * k;
    }

    computeDragWorld(state: InteractionState, point: any): any {
        return point.clone().sub(state.clickedOnPoint);
    }

    computeInPlaneAxes(state: InteractionState): THREE.Vector3[] {
        return this.axes.filter((_, i) => this.names[i] !== state.normalAxis);
    }

    computeDragDir(state: InteractionState, dragWorld: any, inPlaneAxes: any) {
        // want to compute the axis that's closest to the drag vector
        let best = null, bestDot = 0;
        for (const axis of inPlaneAxes) {
            let d = dragWorld.dot(axis);
            if (Math.abs(d) > Math.abs(bestDot)) { bestDot = d; best = axis; }
        }
        state.dragDir = best.clone().multiplyScalar(Math.sign(bestDot));
    }

    computeDragDist(state: InteractionState, currentDragWorld: any) {
        // convert the drag vector to a scalar representing distance of drag
        // the dot product takes the drag direction vector and applies it to the 
        // current drag vector to get a scalar distance 
        state.dragDistance = currentDragWorld.dot(state.dragDir);
    }

    computePrincipalComponent(v: any) {
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

    computeTurns(state: InteractionState) {
        return Math.round(this.computeDragAngle(state.dragDistance) / (Math.PI / 2));
    }

    computeAngle(turns: number) {
        return turns * (Math.PI / 2);
    }

    computeQuaternionRotation(q: THREE.Quaternion, c: Cubelet, center: THREE.Vector3) {
        c.rubikPosition.sub(center).applyQuaternion(q).add(center);
    }

    computeQuaternion(state: InteractionState, angle: number): THREE.Quaternion {
        return new THREE.Quaternion().setFromAxisAngle(state.rotateAroundAxis, angle);
    }

    computePreviewQuaternion(state: InteractionState, currentDragWorld: any): THREE.Quaternion {
        state.dragDistance = currentDragWorld.dot(state.dragDir);
        let angle = this.computeDragAngle(state.dragDistance);
        // rotate just the pivot
        // can't mutate the rubikPosition attributes on the cubelets
        // the drag rotation is just a move preview 
        return this.computeQuaternion(state, angle);
    }

    computeRotationAxis(state: InteractionState) {
        let tempRotationAxis = state.worldNormal.clone().cross(state.dragDir);

        // this switch cleans up dust which accumulates from repeated cross products
        // the principal component won't return a clean axis vector, so we have to 
        // map it ourselves
        let argmax = this.computePrincipalComponent(tempRotationAxis);
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
    }

    computeLayerToRotate(state: InteractionState, cube: any) {
        // selecting the layer to rotate by picking the cubelets which are within 
        // a small threshold of the rotation axis 
        state.layerToRotate = cube.children
            .filter(c => Math.abs((c as Cubelet).rubikPosition.dot(state.rotateAroundAxis)
                - state.clickedOnCubeletPosition.dot(state.rotateAroundAxis)) < 1e-6) as Cubelet[];
    }

    correctPositionsAfterRotation(state: InteractionState) {
        // need to snap the cubelets back to their proper coordinates in the cube lattice 
        state.layerToRotate.forEach((cubelet: Cubelet) => cubelet
            .rubikPosition
            .set(
                this.snap(cubelet.rubikPosition.x),
                this.snap(cubelet.rubikPosition.y),
                this.snap(cubelet.rubikPosition.z)
            )
        );
    }

}