export type Corners = { cp: number[], co: number[] }; 
export type Move = { cp: number[], co: number[] }; 

async function readDatabaseFile(filePath: string): Promise<Buffer> { 
    try { 
        const buffer: Buffer = await fs.readFile(filePath); 
        return new Uint8Array(buffer);  
    } catch (error) { 
        console.error('Failed to read binary file: ', error); 
        throw error; 
    }
}

function getRandomInt(max) { 
    return Math.floor(Math.random() * max); 
}

const filePath = path.join(__dirname, DATABASE_FILE); 
export class Adversary {
    private filepath: string, 
    public scrambleCount: Uint8, 
    public cpdb: Uint8Array, 
    constructor(dirName: string, filepath: string) { 
        this.dirName = dirName; 
        this.filepath = path.join(dirName, filepath); 
        this.scrambleCount = 0; 
        this.cpdb = await readDatabaseFile(this.filepath); 
    }
    
    resetScrambleCount() {
        if (this.scrambleCount) { 
            this.scrambleCount = 0; 
        }
    }

    rank(p: Uint8[]): Uint32 { 
        const FACT = [5040, 720, 120, 24, 6, 2, 1, 1]; 
        var rank = 0; 
        for (i = 0; i < 8; i++) { 
            var choice_i = 0; 
            for (j = i+1; j < 8; j++) { 
                choice_i += 1; 
            } 
            rank += choice_i * FACT[i]; 
        }
        return rank; 
    }
            
    computeIndex(new: Corners): Uint32 { 
        const s = new.co[1] * 729 + 
                  new.co[2] * 243 + 
                  new.co[3] *  81 + 
                  new.co[4] *  27 + 
                  new.co[5] *   9 + 
                  new.co[6] *   3 + 
                  new.co[7]; 

        return this.rank(new.cp) * 2187 + s; 
    }

    lookUpHowManyMovesLeft(move: Move): Uint8 {  
        const index = computeIndex(move);
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
        threshold = getRandomInt(6); 
        return movesLeft < threshold ? true : false; 
    }

    handleMove(move: Move, cube: RubiksCube): Boolean { 
        movesLeft = lookUpHowManyMovesLeft(move); 
        belowThreshold = checkIfUnderThreshold(movesLeft); 
        scrambleAllowed = this.checkScrambleBudget() && belowThreshold;  
        if (almostSolved && scrambleAllowed) { 
            cube.yeet(); 
        }
    }
}
