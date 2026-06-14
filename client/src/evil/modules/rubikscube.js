import * as THREE from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'; 
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';  
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export class RubiksCube { 
    // only 3x3 supported, could have general solution
    constructor(texture) { 
        this.NUM_CUBELETS = 27;  
        this.NUM_CUBELETS_PER_ROW = 3; 
        this.CUBELET_SIZE = 1/3;  
        this.PALETTE = {
            red: "#FF0000",
            orange: "#FF6400",
            yellow: "#FFFF00",
            green: "#00BB00",
            blue: "#0000BB",
            white: "#FFFFFF",
            black: "#000000"
        }; 
        this.FACE_COLORS = {
            0: this.PALETTE.black,
            1: this.PALETTE.black,
            2: this.PALETTE.black,
            3: this.PALETTE.black,
            4: this.PALETTE.black,
            5: this.PALETTE.black
        }; 
        this.loader = new THREE.TextureLoader(); 
        this.texture = this.loader.load(texture); 
    }
        
    computeCubeletFaceColors(i, j, k) {
        if (i == 2) { this.FACE_COLORS[0] = this.PALETTE.red; }     // +X right
        if (i == 0) { this.FACE_COLORS[1] = this.PALETTE.orange; }  // -X left
        if (j == 2) { this.FACE_COLORS[2] = this.PALETTE.white; }   // +Y top
        if (j == 0) { this.FACE_COLORS[3] = this.PALETTE.yellow; }  // -Y bottom
        if (k == 2) { this.FACE_COLORS[4] = this.PALETTE.green; }   // +Z front
        if (k == 0) { this.FACE_COLORS[5] = this.PALETTE.blue; }    // -Z back
    }

    defaultCubeletFaceColors() {
        this.FACE_COLORS = Object.fromEntries(
            Array.from({ length: 6 }, (_, i) => [i, this.PALETTE.black])
        );
    }

    visualize(scene) {
        //TODO handle non 3x3 cubes 
        var cube = new THREE.Group();
        let LINE_DISTANCE_FROM_CUBE_FILLET = 0.027;
        for (let i = 0; i < this.NUM_CUBELETS_PER_ROW; i++) {
            for (let j = 0; j < this.NUM_CUBELETS_PER_ROW; j++) {
                for (let k = 0; k < this.NUM_CUBELETS_PER_ROW; k++) {
                    this.computeCubeletFaceColors(i, j, k);
                    var cubelet = new THREE.Mesh(
                        new RoundedBoxGeometry(this.CUBELET_SIZE, this.CUBELET_SIZE, this.CUBELET_SIZE, 6, 0.05),
                        [
                            new THREE.MeshPhongMaterial({ color: this.FACE_COLORS[0], alphaTest: 0.5 }), // back   -- if i == 2, visible
                            new THREE.MeshPhongMaterial({ color: this.FACE_COLORS[1], alphaTest: 0.5 }), // front  -- if i == 0, visible
                            new THREE.MeshPhongMaterial({ color: this.FACE_COLORS[2], alphaTest: 0.5 }), // top    -- if j == 2, visible
                            new THREE.MeshPhongMaterial({ color: this.FACE_COLORS[3], alphaTest: 0.5 }), // bottom -- if j == 0, visible
                            new THREE.MeshPhongMaterial({ color: this.FACE_COLORS[4], alphaTest: 0.5 }), // left   -- if k == 2, visible
                            new THREE.MeshPhongMaterial({ color: this.FACE_COLORS[5], alphaTest: 0.5 }), // right  -- if k == 0, visible
                        ]
                    );

                    cubelet.position.x += i / this.NUM_CUBELETS_PER_ROW;
                    cubelet.position.y += j / this.NUM_CUBELETS_PER_ROW;
                    cubelet.position.z += k / this.NUM_CUBELETS_PER_ROW; 
                    cubelet.rubikPosition = cubelet.position.clone(); 
                     
                    cubelet.name = `cubelet_${i}${j}${k}`;

                    let edgeLord = new THREE.BoxGeometry(this.CUBELET_SIZE - LINE_DISTANCE_FROM_CUBE_FILLET,
                        this.CUBELET_SIZE - LINE_DISTANCE_FROM_CUBE_FILLET,
                        this.CUBELET_SIZE - LINE_DISTANCE_FROM_CUBE_FILLET); 
                    const edges = new THREE.EdgesGeometry(edgeLord, 1); 
                    //const positions = edges.attributes.position.array;
                    const lineGeometry = new LineSegmentsGeometry().fromEdgesGeometry(edges);  
                    //lineGeometry.setPositions(positions); 
                    const lineMaterial = new LineMaterial({ 
                        color: 'black', 
                        linewidth: 5,
                        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)})
                    ;
                    const cubeEdges = new LineSegments2(lineGeometry, lineMaterial);
                    cubeEdges.layers.set(1);
                    cubelet.add(cubeEdges);
                    cube.add(cubelet);
                    this.defaultCubeletFaceColors();
                }
            }
        }
        scene.add(cube); 
        return cube; 
    }

    rotate(cube, clickedCubelet) { 

    }
}