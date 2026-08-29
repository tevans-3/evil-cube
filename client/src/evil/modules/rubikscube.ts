import * as THREE from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'; 
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';  
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export interface Cubelet extends THREE.Mesh {
    rubikPosition: THREE.Vector3; 
    isCorner: boolean; 
    cornerId: any; // number if isCorner is set to true; null otherwise
}

export interface Cube extends THREE.Group { 
    children: Cubelet[];
}

function cubeletMaterial(color: any, disp: any, ao: any, rough: any) { 
    return new THREE.MeshPhongMaterial({
        map: color,  
        alphaTest: 0.5, 
        displacementMap: disp, 
        displacementScale: 0.005, 
        displacementBias:  -0.005, 
        aoMap: ao, 
        aoMapIntensity: 3.0, 
        roughnessMap: rough, 
        roughnessMapIntensity: 2.0, 
    });
}

export class RubiksCube {
    private NUM_CUBELETS: number;
    private NUM_CUBELETS_PER_ROW: number;
    private CUBELET_SIZE: number;
    private PALETTE: { red: string; orange: string; yellow: string; green: string; blue: string; white: string; black: string; };
    private loader: THREE.TextureLoader;
    private cube: Cube;
    public FACE_COLORS!: Record<number, string>;
    public texture: any; 
    // only 3x3 supported, could have general solution
    constructor(texture: any) { 
        this.NUM_CUBELETS = 27;  
        this.NUM_CUBELETS_PER_ROW = 3; 
        this.CUBELET_SIZE = 1/3; 
        this.loader = new THREE.TextureLoader(); 
        this.PALETTE = {
            red:    this.loader.load("cubelet_color_red.png"),
            orange: this.loader.load("cubelet_color_orange.png"),
            yellow: this.loader.load("cubelet_color_yellow.png"),
            green:  this.loader.load("cubelet_color_green.png"),
            blue:   this.loader.load("cubelet_color_blue.png"), 
            white:  this.loader.load("cubelet_color_white.png"),
            black:  this.loader.load("cubelet_color_black.png"),
        }; 
        this.FACE_COLORS = {
            0: this.PALETTE.black,
            1: this.PALETTE.black,
            2: this.PALETTE.black,
            3: this.PALETTE.black,
            4: this.PALETTE.black,
            5: this.PALETTE.black
        }; 
        this.ao = this.loader.load("cubelet_ao.png");
        this.roughness = this.loader.load("cubelet_roughness.png");
        this.texture = this.loader.load(texture);
        this.displacement = this.loader.load('cubelet_displacement.png'); 
        this.displacement.wrapS = THREE.ClampToEdgeWrapping; 
        this.displacement.wrapT = THREE.ClampToEdgeWrapping;
    }
        
    computeCubeletFaceColors(i: number, j: number, k: number) {
        if (i == 2) { this.FACE_COLORS[0] = this.PALETTE.red;   } // +X right
        if (i == 0) { this.FACE_COLORS[1] = this.PALETTE.orange;} // -X left
        if (j == 2) { this.FACE_COLORS[2] = this.PALETTE.white; } // +Y top
        if (j == 0) { this.FACE_COLORS[3] = this.PALETTE.yellow;} // -Y bottom
        if (k == 2) { this.FACE_COLORS[4] = this.PALETTE.green; } // +Z front
        if (k == 0) { this.FACE_COLORS[5] = this.PALETTE.blue;  } // -Z back
        for (let i = 0; i < 5; i++) { 
            this.FACE_COLORS[i].colorSpace = THREE.SRGBColorSpace; 
        } 
    }

    defaultCubeletFaceColors() {
        this.FACE_COLORS = Object.fromEntries(
            Array.from({ length: 6 }, (_, i) => [i, this.PALETTE.black])
        ) as Record<number, string>;
    }

    computeId(i: number, j: number, k: number) { 
        const max = this.NUM_CUBELETS_PER_ROW - 1; 
        const onEdge =  (v: number): boolean => v == 0 || v == max; 
        const isFront=  (i: number): boolean => i == 2; 
        const isUp   =  (j: number): boolean => j == 2; 
        const isRight = (k: number): boolean => k == 2; 
        const isCorner = onEdge(i) && onEdge(j) && onEdge(k); 
        const front = isFront(i) ? 1 : 0; 
        const up    = isUp(j)? 1 : 0; 
        const right = isRight(k) ? 1 : 0; 
        return isCorner ? (4 * front + 2 * up + right) : null; 
    }

    visualize(scene: any) {
        //TODO handle non 3x3 cubes 
        var cube = new THREE.Group();
        let LINE_DISTANCE_FROM_CUBE_FILLET = 0.027;
        for (let i = 0; i < this.NUM_CUBELETS_PER_ROW; i++) {
            for (let j = 0; j < this.NUM_CUBELETS_PER_ROW; j++) {
                for (let k = 0; k < this.NUM_CUBELETS_PER_ROW; k++) {
                    this.computeCubeletFaceColors(i, j, k);
                    const id = this.computeId(i, j, k); 
                    const cubelet: Cubelet = Object.assign(new THREE.Mesh(
                        new RoundedBoxGeometry(this.CUBELET_SIZE, this.CUBELET_SIZE, this.CUBELET_SIZE, 10, 0.03),
                        [
                            cubeletMaterial(this.FACE_COLORS[0], this.displacement, this.a0, this.rough), // back   -- if i == 2, visible
                            cubeletMaterial(this.FACE_COLORS[1], this.displacement, this.ao, this.rough), // front  -- if i == 0, visible
                            cubeletMaterial(this.FACE_COLORS[2], this.displacement, this.ao, this.rough), // top    -- if j == 2, visible
                            cubeletMaterial(this.FACE_COLORS[3], this.displacement, this.ao, this.rough), // bottom -- if j == 0, visible
                            cubeletMaterial(this.FACE_COLORS[4], this.displacement, this.ao, this.rough), // left   -- if k == 2, visible
                            cubeletMaterial(this.FACE_COLORS[5], this.displacement, this.ao, this.rough), // right  -- if k == 0, visible
                        ]
                    ), 
                        {
                            rubikPosition: new THREE.Vector3(0, 0, 0),
                            isCorner: id ? true : false, 
                            cornerId: id
                        });

                    cubelet.position.x += i / this.NUM_CUBELETS_PER_ROW;
                    cubelet.position.y += j / this.NUM_CUBELETS_PER_ROW;
                    cubelet.position.z += k / this.NUM_CUBELETS_PER_ROW; 
                    cubelet.rubikPosition = cubelet.position.clone(); 
                     
                    cubelet.name = `cubelet_${i}${j}${k}`;

                    let edgeLord = new THREE.BoxGeometry(this.CUBELET_SIZE - LINE_DISTANCE_FROM_CUBE_FILLET - 0.01,
                        this.CUBELET_SIZE - LINE_DISTANCE_FROM_CUBE_FILLET - 0.01,
                        this.CUBELET_SIZE - LINE_DISTANCE_FROM_CUBE_FILLET - 0.01); 
                    const edges = new THREE.EdgesGeometry(edgeLord, 1); 
                    const lineGeometry = new LineSegmentsGeometry().fromEdgesGeometry(edges);  
                    const lineMaterial = new LineMaterial({ 
                        color: 'black', 
                        linewidth: 0,
                        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)})
                    ;
                    const cubeEdges = new LineSegments2(lineGeometry, lineMaterial);
                    cubeEdges.layers.set(1);
                    cubelet.castShadow = true; 
                    cubelet.receiveShadow = true;
                    cubelet.geometry.setAttribute('uv1', cubelet.geometry.attributes.uv.clone()); 
                    cubelet.add(cubeEdges);
                    cube.add(cubelet);
                    this.defaultCubeletFaceColors();
                }
            }
        }
        scene.add(cube); 
        return cube; 
    }
}
