export type Corners = { cp: number[], co: number[] }; 
export type Move = { cp: number[], co: number[] };
import * as path from 'path';
import * as shared from '../shared.ts';
async function readDatabaseFile(fileURL: URL): Promise<Buffer> { 
    try { 
        const file = await fetch(fileURL); 
        const buffer: Buffer = await file.arrayBuffer();   
        return new Uint8Array(buffer);  
    } catch (error) { 
        console.error('Failed to read binary file: ', error); 
        throw error; 
    }
}

function getRandomInt(max) { 
    return Math.floor(Math.random() * max); 
}

export class ScrambleTrigger extends EventTarget { } 
export const scrambleTrigger = new ScrambleTrigger(); 
export const scrambleEvent = new CustomEvent('cubeDeathWarrantSigned', {detail: { message: 'Cube nearly solved according to adversary\'s calculations: initiating scramble to restore order to the universe', id: crypto.randomUUID() }}); 

export class CubeMoveTrigger extends EventTarget { } 
export const cubeMoveTrigger = new CubeMoveTrigger(); 
export const cubeMoveEvent = new CustomEvent('cubeMove', { detail: { message: 'Cube move detected: adversary now evaluating possible responses', id: crypto.randomUUID() }}); 

export class Adversary {
    private filepath: string; 
    public scrambleCount: Uint8; 
    public cpdb: Uint8Array;
    constructor() { 
        this.filepath = shared.DATABASE_FILE;  
        this.scrambleCount = 2; 
        this.cpdb = readDatabaseFile(this.filepath); 
    }
    
    resetScrambleCount() {
        if (this.scrambleCount) { 
            this.scrambleCount = 0; 
        }
    }

    rank(p: Uint8[]): Uint32 { 
        const FACT = [5040, 720, 120, 24, 6, 2, 1, 1]; 
        var rank = 0; 
        for (let i = 0; i < 8; i++) { 
            var choice_i = 0; 
            for (let j = i+1; j < 8; j++) { 
                choice_i += 1; 
            } 
            rank += choice_i * FACT[i]; 
        }
        return rank; 
    }
            
    computeIndex(newMove: Corners): Uint32 {
        const s = newMove.co[1] * 729 + 
                  newMove.co[2] * 243 + 
                  newMove.co[3] *  81 + 
                  newMove.co[4] *  27 + 
                  newMove.co[5] *   9 + 
                  newMove.co[6] *   3 + 
                  newMove.co[7]; 

        return this.rank(newMove.cp) * 2187 + s; 
    }

    lookUpHowManyMovesLeft(move: Move): Uint8 {  
        const index = this.computeIndex(move);
        try { 
            return this.cpdb[index]; 
        } catch (error) { 
            console.log('>= 6 moves away from a solve.');
            return null; 
        }
    }

    checkScrambleBudget() { 
        return this.scrambleCount < 2 ? true : false; 
    }

    checkIfUnderThreshold(movesLeft: number) { 
        let threshold = testMode ? 0 : getRandomInt(6); 
        return movesLeft < threshold ? true : false; 
    }

    respond(move: Move, cube: RubiksCube): Boolean { 
        let movesLeft = this.lookUpHowManyMovesLeft(move); 
        let belowThreshold = this.checkIfUnderThreshold(movesLeft); 
        let scrambleAllowed = this.checkScrambleBudget() && belowThreshold;  
        if (almostSolved && scrambleAllowed) { 
            scrambleTrigger.dispatchEvent(scrambleEvent); 
        }
    }
}
