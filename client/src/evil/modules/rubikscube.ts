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

function cubeletMaterial(color: any, maps: any) { 
    return new THREE.MeshStandardMaterial({
        map: color,
        //displacementMap: maps.disp, 
        //displacementScale: 0.001,
        //displacementBias:  -0.001,
        normalMap: maps.normal, 
        aoMap: maps.ao, 
        aoMapIntensity: 1.0,
        roughnessMap: maps.rough,
        roughness: 1.0, 
        metalness: 0.0,
        bumpMap: maps.bump, 
        bumpScale: 0.05,
    });
}

const black = new THREE.MeshStandardMaterial({ color: 0x141417, roughness: 0.62}); 

export class RubiksCube {
    private NUM_CUBELETS: number;
    private NUM_CUBELETS_PER_ROW: number;
    private CUBELET_SIZE: number;
    private PALETTE: { red: any; orange: any; yellow: any; green: any; blue: any; white: any; black: any; };
    private loader: THREE.TextureLoader;
    private cube: Cube;
    public FACE_COLORS!: Record<number, string>;
    public texture: any; 
    // only 3x3 supported, could have general solution
    constructor(maxAnisotropy: any) { 
        this.NUM_CUBELETS = 27;  
        this.NUM_CUBELETS_PER_ROW = 3; 
        this.CUBELET_SIZE = 1/3; 
        this.loader = new THREE.TextureLoader(); 
        this.PALETTE = {
            red:    this.configure(this.loader.load("cubelet_color_red.png"), true), 
            orange: this.configure(this.loader.load("cubelet_color_orange.png"), true), 
            yellow: this.configure(this.loader.load("cubelet_color_yellow.png"), true), 
            green:  this.configure(this.loader.load("cubelet_color_green.png"), true), 
            blue:   this.configure(this.loader.load("cubelet_color_blue.png"), true), 
            white:  this.configure(this.loader.load("cubelet_color_white.png"), true), 
            black:  this.configure(this.loader.load("cubelet_color_black.png"), true), 
        }; 
        this.FACE_COLORS = {
            0: this.PALETTE.black,
            1: this.PALETTE.black,
            2: this.PALETTE.black,
            3: this.PALETTE.black,
            4: this.PALETTE.black,
            5: this.PALETTE.black
        }; 
        this.ao = this.configure(this.loader.load("cubelet_ao.png"));
        this.roughness = this.configure(this.loader.load("cubelet_roughness.png"));
        this.displacement = this.configure(this.loader.load('cubelet_displacement.png')); 
        this.displacement.wrapS = THREE.ClampToEdgeWrapping; 
        this.displacement.wrapT = THREE.ClampToEdgeWrapping;
        this.bump = this.configure(this.loader.load("cubelet_bump.png"));
        this.normal = this.configure(this.loader.load("cubelet_normal.png")); 
        this.maps = { disp: this.displacement, 
                      bump: this.bump, 
                      rough: this.roughness, 
                      ao: this.ao, 
                      normal: this.normal,
        };
        this.maxAnisotropy = maxAnisotropy; 
    }

    configure(texture: any, srgb: boolean) { 
        if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping; 
        texture.anisotropy = this.maxAnisotropy;
        texture.needsUpdate = true;
        return texture; 
    }
        
    computeCubeletFaceColors(i: number, j: number, k: number) {
        if (i == 2) { this.FACE_COLORS[0] = this.PALETTE.red;   } // +X right 
        if (i == 0) { this.FACE_COLORS[1] = this.PALETTE.orange;} // -X left
        if (j == 2) { this.FACE_COLORS[2] = this.PALETTE.white; } // +Y top
        if (j == 0) { this.FACE_COLORS[3] = this.PALETTE.yellow;} // -Y bottom
        if (k == 2) { this.FACE_COLORS[4] = this.PALETTE.green; } // +Z front
        if (k == 0) { this.FACE_COLORS[5] = this.PALETTE.blue;  } // -Z back
    }

    defaultCubeletFaceColors() {
        this.FACE_COLORS = Object.fromEntries(
            Array.from({ length: 6 }, (_, i) => [i, black])//this.PALETTE.black])
        ) as Record<number, string>;
    }

    computeId(i: number, j: number, k: number) { 
        const max = this.NUM_CUBELETS_PER_ROW - 1; 
        const onEdge =  (v: number): boolean => v == 0 || v == max; 
        const isFront=  (i: number): boolean => i == 2; 
        const isUp   =  (j: number):boolean => j == 2; 
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
        for (let i = 0; i < this.NUM_CUBELETS_PER_ROW; i++) {
            for (let j = 0; j < this.NUM_CUBELETS_PER_ROW; j++) {
                for (let k = 0; k < this.NUM_CUBELETS_PER_ROW; k++) {
                    this.computeCubeletFaceColors(i, j, k);
                    const id = this.computeId(i, j, k); 
                    const cubelet: Cubelet = Object.assign(new THREE.Mesh(
                        new RoundedBoxGeometry(this.CUBELET_SIZE, this.CUBELET_SIZE, this.CUBELET_SIZE, 5, 0.03),
                        [
                            i == 2 ? cubeletMaterial(this.FACE_COLORS[0], this.maps) : black, // back   -- if i == 2, visible
                            i == 0 ? cubeletMaterial(this.FACE_COLORS[1], this.maps) : black, // front  -- if i == 0, visible
                            j == 2 ? cubeletMaterial(this.FACE_COLORS[2], this.maps) : black, // top    -- if j == 2, visible
                            j == 0 ? cubeletMaterial(this.FACE_COLORS[3], this.maps) : black, // bottom -- if j == 0, visible
                            k == 2 ? cubeletMaterial(this.FACE_COLORS[4], this.maps) : black, // left   -- if k == 2, visible
                            k == 0 ? cubeletMaterial(this.FACE_COLORS[5], this.maps): black, // right  -- if k == 0, visible
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
                    cubelet.castShadow = true; 
                    cubelet.receiveShadow = true;
                    cubelet.geometry.setAttribute('uv1', cubelet.geometry.attributes.uv.clone()); 
                    cube.add(cubelet);
                    this.defaultCubeletFaceColors();
                }
            }
        }
        scene.add(cube); 
        return cube; 
    }

    //TODO fix this. does not actually delete cube
    delete = () => { 
        this.traverse((child) => { 
            if (child.isMesh) { 
                child.geometry.dispose(); 
                
                if (child.material) { 
                    if (Array.isArray(child.material)) { 
                        child.material.forEach((mat) => this.disposeMaterial(mat)); 
                    } else { 
                        disposeMaterial(child.material); 
                    }
                }
            }
        }); 
        this.removeFromParent(); 
    } 

    disposeMaterial(material) { 
        for (const key of Object.keys(material)) { 
            const value = material[key]; 
            if (value && typeof value == 'object' && 'minFilter' in value) { 
                value.dispose(); 
            } 
        } 
        material.dispose(); 
    }

}
