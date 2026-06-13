import * as THREE from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'; 
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';  

export class RubiksCube { 
    // only 3x3 supported, could have general solution
    constructor(texture) { 
        this.NUM_CUBELETS = 27;  
        this.NUM_CUBELETS_PER_ROW = 3; 
        this.CUBELET_SIZE = 1/3;  
        this.FACE_COLORS = ["#FF0000",
                            "#FF6400",
                            "#FFFF00",
                            "#00BB00",
                            "#0000BB",
                            "#FFFFFF", 
                            "#000000"]; 
        this.loader = new THREE.TextureLoader(); 
        this.texture = this.loader.load(texture); 
    }

    visualize(scene) {
        //TODO handle non 3x3 cubes
        var cube = new THREE.Group();

        for (let i = 0; i < this.NUM_CUBELETS_PER_ROW; i++) {
            for (let j = 0; j < this.NUM_CUBELETS_PER_ROW; j++) {
                for (let k = 0; k < this.NUM_CUBELETS_PER_ROW; k++) {

                    var cubelet = new THREE.Mesh(
                        new THREE.BoxGeometry(this.CUBELET_SIZE, this.CUBELET_SIZE, this.CUBELET_SIZE),
                        [
                            new THREE.MeshPhongMaterial({ color: this.FACE_COLORS[0], alphaTest: 0.5 }),
                            new THREE.MeshPhongMaterial({ color: this.FACE_COLORS[1], alphaTest: 0.5 }),
                            new THREE.MeshPhongMaterial({ color: this.FACE_COLORS[2], alphaTest: 0.5 }),
                            new THREE.MeshPhongMaterial({ color: this.FACE_COLORS[3], alphaTest: 0.5 }),
                            new THREE.MeshPhongMaterial({ color: this.FACE_COLORS[4], alphaTest: 0.5 }),
                            new THREE.MeshPhongMaterial({ color: this.FACE_COLORS[5], alphaTest: 0.5 }),
                        ]
                    );

                    cubelet.position.x += i / this.NUM_CUBELETS_PER_ROW;
                    cubelet.position.y += j / this.NUM_CUBELETS_PER_ROW;
                    cubelet.position.z += k / this.NUM_CUBELETS_PER_ROW;
                    cubelet.rubikPosition = cubelet.position.clone(); 
                     
                    cubelet.name = `cubelet_${i}${j}${k}`;

                    let edgeLord = new THREE.BoxGeometry(this.CUBELET_SIZE, this.CUBELET_SIZE, this.CUBELET_SIZE); 
                    const edges = new THREE.EdgesGeometry(edgeLord, 1); 
                    const positions = edges.attributes.position.array;
                    const lineGeometry = new LineSegmentsGeometry().fromEdgesGeometry(edges);  
                    lineGeometry.setPositions(positions); 
                    const lineMaterial = new LineMaterial({ 
                        color: 'black', 
                        linewidth: 10,
                        gapSize: 1,
                        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)})
                    ;
                    const cubeEdges = new LineSegments2(lineGeometry, lineMaterial);
                    cubeEdges.layers.set(1);
                    cubelet.add(cubeEdges);
                    cube.add(cubelet);
                }
            }
        }
        scene.add(cube); 
        return cube; 
    }

    rotate(cube, clickedCubelet) { 

    }
}