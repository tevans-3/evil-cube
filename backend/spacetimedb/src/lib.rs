use spacetimedb::{table, reducer, Table, ReducerContext, Identity, Timestamp}; 

pub const CORNER_CONFIGURATIONS_CT: u32 = 88179840; 

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
	corner_state: [u8; 4], // we only care about the corners
}

#[reducer] 
pub fn permute_corners_on_move(ctx: &ReducerContext, corners: [u8; 4]) -> Result<(), String> { 
	if let Some(cuber) = ctx.db.cuber().identity().find(ctx.sender()) { 
		ctx.db.cuber().identity().update(Cuber { c

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

#[reducer] 
pub fn scramble_cube(ctx: &ReducerContext) -> Result<(), String> { 
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
// procedure -- http request send leaderboard delta to client (top 25 best scores in Cuber) 