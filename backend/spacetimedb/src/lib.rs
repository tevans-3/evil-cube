use spacetimedb::{table, reducer, Table, ReducerContext, Identity, Timestamp}; 

pub const CORNER_CONFIGURATIONS_CT: u32 = 88179840;

// cp[i] - the piece in slot i moves to this slot; co[i] - the twist (mod 3) it gains 
pub struct Move { pub cp: [u8; 8], pub co: [u8; 8] } 

// Corner ids: 0 LDB 1 LDF 2 LUB 3 LUF 4 RDB 5 RDF 6 RUB 7 RUF  (id = 4*right + 2*up + front) 
//      right = 1 if corner is right, up = 1 if corner is up, front = 1 if corner is front 
// Order: U U2 U' D D2 D' R R2 R' L L2 L' F F2 F' B B2 B'

pub const MOVES: [Move; 18] = [
    Move { cp: [0, 1, 3, 7, 4, 5, 2, 6], co: [0, 0, 0, 0, 0, 0, 0, 0] },  // U
    Move { cp: [0, 1, 7, 6, 4, 5, 3, 2], co: [0, 0, 0, 0, 0, 0, 0, 0] },  // U2
    Move { cp: [0, 1, 6, 2, 4, 5, 7, 3], co: [0, 0, 0, 0, 0, 0, 0, 0] },  // U'
    Move { cp: [1, 5, 2, 3, 0, 4, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },  // D
    Move { cp: [5, 4, 2, 3, 1, 0, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },  // D2
    Move { cp: [4, 0, 2, 3, 5, 1, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },  // D'
    Move { cp: [0, 1, 2, 3, 6, 4, 7, 5], co: [0, 0, 0, 0, 1, 2, 2, 1] },  // R
    Move { cp: [0, 1, 2, 3, 7, 6, 5, 4], co: [0, 0, 0, 0, 0, 0, 0, 0] },  // R2
    Move { cp: [0, 1, 2, 3, 5, 7, 4, 6], co: [0, 0, 0, 0, 1, 2, 2, 1] },  // R'
    Move { cp: [2, 0, 3, 1, 4, 5, 6, 7], co: [2, 1, 1, 2, 0, 0, 0, 0] },  // L
    Move { cp: [3, 2, 1, 0, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },  // L2
    Move { cp: [1, 3, 0, 2, 4, 5, 6, 7], co: [2, 1, 1, 2, 0, 0, 0, 0] },  // L'
    Move { cp: [0, 5, 2, 1, 4, 7, 6, 3], co: [0, 2, 0, 1, 0, 1, 0, 2] },  // F
    Move { cp: [0, 7, 2, 5, 4, 3, 6, 1], co: [0, 0, 0, 0, 0, 0, 0, 0] },  // F2
    Move { cp: [0, 3, 2, 7, 4, 1, 6, 5], co: [0, 2, 0, 1, 0, 1, 0, 2] },  // F'
    Move { cp: [4, 1, 0, 3, 6, 5, 2, 7], co: [1, 0, 2, 0, 2, 0, 1, 0] },  // B
    Move { cp: [6, 1, 4, 3, 2, 5, 0, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },  // B2
    Move { cp: [2, 1, 6, 3, 0, 5, 4, 7], co: [1, 0, 2, 0, 2, 0, 1, 0] },  // B'
];

#[table(accessor = cuber, public)]
pub struct Cuber { 
	#[primary_key] 
	identity: Identity, 
	verified: bool, // verified == consenting human participant solving cube synchronously under supervision, or agent
	is_human: bool, // this is not a verdict on the cuber's humanity; it just indicates if the solver is an agent
	name: Option<string>, // I recommend Gregor Samsa, but they can pick anything they like 
	best_solve_movect: u32, 
	best_solve_singmaster: Vec<u32>,
	distance_to_solve: u64,
	state: Move, // we only care about the corners
}


// the client will scramble the cube and then write the new corner positions using this reducer 
#[reducer] 
pub fn apply_move(ctx: &ReducerContext, m: Move) -> Result<(), String> { 
	if let Some(cuber) = ctx.db.cuber().identity().find(ctx.sender()) { 
		// TODO: generate PDB, wire up client, build leaderboard (it's just a subscriber) 
		ctx.db.cuber().identity().update(Cuber { state: update_state(cuber.state, m), ..Cuber}); 
		Ok(())
	} else { 
		Err("Failed to apply move".to_string()) 
	}
}

fn update_state(state: Move, new: Move) -> Move {
	new_move: Move = Move { cp: [0,0,0,0,0,0,0,0], co: [0,0,0,0,0,0,0,0] }; 
	for i in range(0..8} { 
		new_move[new.cp[i]] = state.cp[i]; 
		new_move[new.co[i]] = (state.co[i] + new.co[i]) % 3;  
	}
	new_move
}


#[table(accessor = cornerpdb, public)] 
pub struct CornerPatternDatabase { 
	#[primary_key] 
	pdb_identity: Identity, 
	pdb: [u32; CORNER_CONFIGURATIONS_CT] = [0; CORNER_CONFIGURATIONS_CT]; 
}

#[reducer] 
pub fn set_name(ctx: &ReducerContext, name: String) -> Result<(), String> { 
	let name = validate_name(name)?; 
	if let Some(cuber) = ctx.db.cuber().identity().find(ctx.sender()) {
		ctx.db.cuber().identity().update(Cuber { name: Some(name), ..cuber }); 
		Ok(()) 
	} else { 
		Err("Cannot set name for unknown cuber".to_string())
	}
}

fn validate_name(name: String) -> Result<String, String> { 
	if name.is_empty() { 
		Err("Names must not be empty".to_string())
	} else if name.len() > 25 { 
		Err("Names must be 30 characters or less".to_string())
	} else { 
		Ok(name) 
	}
}

#[reducer] 
pub fn set_verified(ctx: &ReducerContext, status: bool) -> Result<(), String> { 
	if let Some(cuber) = ctx.db.cuber().identity().find(ctx.sender()) { 
		ctx.db.cuber().identity().update(Cuber { status: Some(status), ..cuber }); 
		Ok(())
	} else { 
		Err("Failed to set verified status for cuber".to_string())
	}
}

#[reducer] 
pub fn set_human_status(ctx: &ReducerContext, is_human: bool) -> Result<(), String> { 
	if let Some(cuber) = ctx.db.cuber().identity().find(ctx.sender()) { 
		ctx.db.cuber().identity().update(Cuber { is_human: Some(is_human), ..cuber }); 
		Ok(())
 	} else { 
		 Err("Failed to set human status for cuber".to_string())
	 }
}

#[reducer] 
pub fn set_best_solve_movect(ctx: &ReducerContext, best_solve_movect: i32) -> Result<(), String> { 
	if let Some(cuber) = ctx.db.cuber().identity().find(ctx.sender()) { 
		ctx.db.cuber().identity().update(Cuber { best_solve_movect: Some(best_solve_movect), ..cuber }); 
		Ok(())
	} else { 
		Err("Failed to set best move count for cuber".to_string())
	}
} 

#[reducer] 
pub fn set_best_solve_singmaster(ctx: &ReducerContext, best_solve_singmaster: String) -> Result<(), String> { 
	let best_solve_singmaster = validate_singmaster(best_solve_singmaster)?; 
	if let Some(cuber) = ctx.db.cuber().identity().find(ctx.sender()) { 
		ctx.db.cuber().identity().update(Cuber { best_solve_singmaster: Some(best_solve_singmaster), ..cuber }); 
		Ok(())
	} else { 
		Err("Failed to set best solve string for cuber".to_string())
	}
}

// this is only a partial validation: it does not validate semantic consistency 
// (e.g., that a given move string actually produces a valid cube configuration) 
fn validate_singmaster(move_string: String) -> Result<String, String> { 
	if move_string.is_empty() { 
		Err("Move strings must not be empty".to_string())
	} else if move_string.chars().filter(ch => 
			ch != 'T' && ch != 'B' &&
			ch != 'R' && ch != 'L' && 
			ch != 'F' && ch != 'P' && 
			ch != '+' && ch != '-' && 
			ch != '2').is_empty() { 
				Err("Move strings can only contain: T,B,R,L,F,P,+,-,2".to_string())
	} else { 
		Ok(move_string) 
	}
}

#[reducer] 
pub fn set_distance_to_solve(ctx: &ReducerContext, distance: u64) -> Result<(), String> { 
	if let Some(cuber) = ctx.db.cuber().identity().find(ctx.sender()) { 
		ctx.db.cuber().identity().update(cuber { distance: Some(distance), ..cuber }); 
		Ok(())
	} else { 
		Err("Failed to set distance to solve for cuber".to_string())
	}
}

fn verify_solve(ctx: &ReducerContext, solve_move_string: String) -> Result<(), String> { 
}


// new cuber 
// new cube 
// new pdb 
// set name X
// validate name X 
// set verified status X
// set human status X  
// set best solve move count X
// set singmaster move string X
// set distance to solve 
// verify solve 
// lookup configuration in pattern database 
// set distance to solve
// procedure -- http request receive cube state from client 
// procedure -- http request send cube state to client (scramble) 