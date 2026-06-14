use spacetimedb::{table, reducer, Table, ReducerContext, Identity, Timestamp}; 

#[table(accessor = cuber, public)]
pub struct Cuber { 
	#[primary_key] 
	identity: Identity, 
	verified: bool, // verified == consenting human participant solving cube synchronously under supervision, or agent
	is_human: bool, // this is not a verdict on the cuber's humanity; it just indicates if they are or are not an agent  
	name: Option<string>, // I recommend Gregor Samsa, but they can pick anything they like 
	best_solve_movect: i32, 
	best_solve_singmaster: Vec<i32>,
}

#[table(accessor = cube, public)] 
pub struct Cube { 
	#[primary_key] 
	cuber_identity: Identity, 
	state: [[u8; 9]; 6] = [[0; 9]; 6]; 
}

#[reducer] 
pub fn set_name(ctx: &ReducerContext, name: String) -> Result<(), String> { 
	let name = validate_name(name)?; 
	if let Some(user) = ctx.db.user().identity().find(ctx.sender()) {
		ctx.db.user().identity().update(User { name: Some(name), ..user }); 
		Ok(()) 
	} else { 
		Err("Cannot set name for unknown user".to_string())
	}
}

fn validate_name(name: String) -> Result<String, String> { 
	if name.is_empty() { 
		Err("Names must not be empty".to_string())
	} else { 
		Ok(name) 
	}
}

#[reducer] 
pub fn 

// 