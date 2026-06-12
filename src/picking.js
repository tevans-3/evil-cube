import * as THREE from 'three'; 
import { _principalComponent, pickPosition } from './shared.js'; 

export class PickHelper { 
    constructor() { 
        this.raycaster = new THREE.Raycaster();
        this.raycaster.layers.set(0);
        this.faceNormal = null; 
        this.point = null; 
        this.pickedObject = null; 
        this.pickedObjectSavedColor = 0; 
    }

    pick(normalizedPosition, scene, camera, time) {
        if (this.pickedObject) {
            this.pickedObject.material.forEach(material => material.emissive.setHex(this.pickedObjectSavedColor)); 
            this.pickedObject = undefined; 
        }

        this.raycaster.setFromCamera(normalizedPosition, camera); 
        const intersectedObjects = this.raycaster.intersectObjects(scene.children, true);

        if (intersectedObjects.length) { 
            if (!intersectedObjects[0].face) return;
            this.pickedObject = intersectedObjects[0].object;
            // faceNormal is the vector perpendicular to the clicked-on face 
            // of the cube's axes, of the face's in-plane axes, the face normal 
            // is the only out-of-plane axis (it's perpendicular)
            this.faceNormal = intersectedObjects[0].face.normal;

            // this is the clicked-on point, intersected by the camera's ray 
            this.point = intersectedObjects[0].point; 

            // .transformDirection is the rotation
            // applying it here transforms the face normal to the world normal 
            // (lifts it out of the cubelet's local geometry into the world geomtry)
            const worldNormal = this.faceNormal.clone() 
                        .transformDirection(this.pickedObject.matrixWorld);
            
            // this takes the camera's ray's intersected clicked-on point and uses it 
            // to set the plane of the clicked-on face 
            let plane = new THREE.Plane(worldNormal)
                            .setFromNormalAndCoplanarPoint(worldNormal, this.point); 

            // the cube has six faces: +X (right), -X (left), +Z (front), -Z (back), 
            // +Y (up), -Y (down). The question of "Which face was clicked?" is the 
            // question of "Which one of these unit vectors is aligned to the normal
            // of the clicked-on face transformed into world space?"
            //
            // any vector direction relative to these axes maps to a value 
            // in [-1,1] where -1 is "pointing in the opposite direction", 0 is 
            // "perpendicular", and 1 is "parallel and pointing in the same direction"
            // 
            // any vector's components are dot products with the unit vectors e.g. 
            // given a vector n, n.x = n * (1,0,0). So the world normal's components 
            // describe "how parallel is this axis to the clicked-on face"? 
            // 
            // the principal component gives us the largest magnitude component (axis), 
            // which is the component nearest to 1, in other words, the most nearly parallel
            const axis = _principalComponent(worldNormal);

            // the sign gives us which specific face e.g. +X or -X 
            const side = Math.sign(worldNormal[axis]);

            this.pickedObject.material.forEach(material => material.emissive.setHex((time*8) %2 > 1 ? 0xFFFF00 : 0xFF0000));
        }
    }
}