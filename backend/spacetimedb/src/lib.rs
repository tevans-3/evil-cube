use spacetimedb::{table, reducer, Table, ReducerContext, Identity, Timestamp, 
					view, ViewContext, AnonymousViewContext, SpacetimeType}; 
use std::collections::VecDeque; 

pub const UNVISITED: u8 = u8::MAX; 

pub const CORNER_CONFIGURATIONS_CT: u32 = 88179840;

// cp[i] - the piece in slot i moves to this slot; co[i] - the twist (mod 3) it gains 
#[derive(Clone, Copy)]
pub struct Move { pub cp: [u8; 8], pub co: [u8; 8] } 

// we need this to store an authoritative record of the cuber's moves and to clearly 
// differentiate Move from State types. Without that record, the server can't maintain 
// a single source of truth for cube state, and has to trust that the client-delivered 
// state is accurate. Without that differentiation, Moves have to be a SpacetimeType, 
// which introduces all kinds of ugliness and is also just conceptually inaccurate. 
// (The ugliness is mainly heap allocations in BFS, plus LazyLocks since Vecs can't 
// be initialized at compile time which means they can't be initialized in consts.)
#[derive(SpacetimeType, Clone)]
pub struct State { pub cp: Vec<u8>, pub co: Vec<u8> } 

// Corner ids: 0 LDB 1 LDF 2 LUB 3 LUF 4 RDB 5 RDF 6 RUB 7 RUF  (id = 4*right + 2*up + front) 
//      right = 1 if corner is right, up = 1 if corner is up, front = 1 if corner is front 
// Order: U U2 U' D D2 D' R R2 R' L L2 L' F F2 F' B B2 B'

pub const MOVES: [Move; 18] = [
    Move { cp: [0, 1, 3, 7, 4, 5, 2, 6], co: [0, 0, 0, 0, 0, 0, 0, 0] }, // U
    Move { cp: [0, 1, 7, 6, 4, 5, 3, 2], co: [0, 0, 0, 0, 0, 0, 0, 0] }, // U2
    Move { cp: [0, 1, 6, 2, 4, 5, 7, 3], co: [0, 0, 0, 0, 0, 0, 0, 0] }, // U'
    Move { cp: [1, 5, 2, 3, 0, 4, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] }, // D
    Move { cp: [5, 4, 2, 3, 1, 0, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] }, // D2
    Move { cp: [4, 0, 2, 3, 5, 1, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] }, // D'
    Move { cp: [0, 1, 2, 3, 6, 4, 7, 5], co: [0, 0, 0, 0, 1, 2, 2, 1] }, // R
    Move { cp: [0, 1, 2, 3, 7, 6, 5, 4], co: [0, 0, 0, 0, 0, 0, 0, 0] }, // R2
    Move { cp: [0, 1, 2, 3, 5, 7, 4, 6], co: [0, 0, 0, 0, 1, 2, 2, 1] }, // R'
    Move { cp: [2, 0, 3, 1, 4, 5, 6, 7], co: [2, 1, 1, 2, 0, 0, 0, 0] }, // L
    Move { cp: [3, 2, 1, 0, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] }, // L2
    Move { cp: [1, 3, 0, 2, 4, 5, 6, 7], co: [2, 1, 1, 2, 0, 0, 0, 0] }, // L'
    Move { cp: [0, 5, 2, 1, 4, 7, 6, 3], co: [0, 2, 0, 1, 0, 1, 0, 2] }, // F
    Move { cp: [0, 7, 2, 5, 4, 3, 6, 1], co: [0, 0, 0, 0, 0, 0, 0, 0] }, // F2
    Move { cp: [0, 3, 2, 7, 4, 1, 6, 5], co: [0, 2, 0, 1, 0, 1, 0, 2] }, // F'
    Move { cp: [4, 1, 0, 3, 6, 5, 2, 7], co: [1, 0, 2, 0, 2, 0, 1, 0] }, // B
    Move { cp: [6, 1, 4, 3, 2, 5, 0, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] }, // B2
    Move { cp: [2, 1, 6, 3, 0, 5, 4, 7], co: [1, 0, 2, 0, 2, 0, 1, 0] }, // B'
];

#[table(accessor = cuber, public)]
pub struct Cuber { 
	#[primary_key] 
	identity: Identity, 
	verified: bool, // verified == consenting human participant solving cube synchronously under supervision, or agent
	is_human: bool, // this is not a verdict on the cuber's humanity; it just indicates if the solver is an agent
	name: String, // I recommend Gregor Samsa, but they can pick anything they like 
	best_score_movect: u32, 
	best_score_singmaster: String,
	distance_to_solve: u64,
	state: State,
}

#[reducer(client_connected)] 
pub fn client_connected(ctx: &ReducerContext) -> Result<(), String> { 
	ctx.db.cuber().insert(Cuber { 
		identity: ctx.sender(), 
		verified: false, 
		is_human: true, 
		name:String::new(), 
		best_score_movect: 0, 
		best_score_singmaster: String::new(), 
		distance_to_solve: 88179840, 
		state: State { cp: vec![0,1,2,3,4,5,6,7], co: vec![0,0,0,0,0,0,0,0] },
	}); 
	Ok(())
}

// the client will scramble the cube and then write the new corner positions using this reducer 
#[reducer] 
pub fn apply_move(ctx: &ReducerContext, m: u8) -> Result<(), String> { 
	if m > 17 { 
		return Err("Move indices are only valid in [0,17]".to_string()); 
	}
	let m: Move = MOVES[m as usize];
	if let Some(cuber) = ctx.db.cuber().identity().find(ctx.sender()) { 
		// TODO: generate PDB, wire up client, build leaderboard (it's just a subscriber, subscribed to an AnonymousViewContext) 
		ctx.db.cuber().identity().update(Cuber { state: update_state(&cuber.state, m), ..cuber}); 
		// lookup corner state in PDB and update distance to solve so that subscriber scrambler 
		// is triggered if distance <= scramble_threshold 
		Ok(())
	} else { 
		Err("Failed to apply move".to_string()) 
	}
}

fn update_state(state: &State, mv: Move) -> State {
	let mut new: State = State{ cp: vec![0,0,0,0,0,0,0,0], co: vec![0,0,0,0,0,0,0,0] }; 
	for j in 0..8 { 
		let idx: usize = mv.cp[j] as usize; 
		new.cp[idx] = (*state).cp[j]; 
		new.co[idx] = ((*state).co[j] + mv.co[j]) % 3;  
	}
	new
}

pub struct BreadthFirstCornerSearcher { 
	visited: u32,
	explored_moves: VecDeque<State>,
}

impl BreadthFirstCornerSearcher { 
	pub fn new() -> BreadthFirstCornerSearcher { 
		BreadthFirstCornerSearcher {
			visited: 0,
			explored_moves: VecDeque::<State>::new(),
		}
	}

	pub fn perform_bfs(&mut self, identity_state: State, pdb: &mut DbStorage) { 
		self.explored_moves.push_back(identity_state.clone()); 
		pdb.set_at_index(pdb.get_index(&identity_state).try_into().unwrap(), 0); 
		while self.explored_moves.is_empty() == false {
			let curr = self.explored_moves.pop_front().unwrap(); 
			for mv in MOVES {
				let new: State = update_state(&curr, mv).try_into().unwrap(); 
				let new_slot_in_pdb = pdb.get_at_index(pdb.get_index(&new).try_into().unwrap()) as u8; 
				let current_dist = pdb.get_at_index(pdb.get_index(&curr).try_into().unwrap()); 
				if new_slot_in_pdb == UNVISITED { 
					pdb.set_at_index(pdb.get_index(&new).try_into().unwrap(), 
							(current_dist + 1).try_into().unwrap());
					self.explored_moves.push_back(new); 
				}
			}
		}
	}
}

#[derive(SpacetimeType)]
pub struct DbStorage { 
	store: Vec<u8>, 
} 

impl DbStorage { 
	pub fn new() -> DbStorage { 
		DbStorage { 
			store: vec![UNVISITED; CORNER_CONFIGURATIONS_CT as usize],
		}
	}

	fn rank(p: &Vec<u8>) -> u32 { 
		const FACT: [u32; 8] = [5040, 720, 120, 24, 6, 2, 1, 1]; 
		let mut rank = 0u32; 
		for i in 0..8 { 
			let mut choice_i = 0u32; 
			for j in (i+1)..8 { 
				if p[j] < p[i] { 
					choice_i += 1; 
				}
			}
			rank += choice_i * FACT[i]; 
		}
		rank
	}

	pub fn get_index(&self, new: &State) -> u32 { 
		let s: u32 = 
				new.co[1] as u32 * 729 + 
				new.co[2] as u32 * 243 + 
				new.co[3] as u32 *  81 + 
				new.co[4] as u32 *  27 +
				new.co[5] as u32 *   9 + 
				new.co[6] as u32 *   3 + 
				new.co[7] as u32; 

		return DbStorage::rank(&new.cp) * 2187 + s;
	}

	pub fn get_at_index(&self, idx: usize) -> u32 { 
		self.store[idx].into()
	}

	pub fn set_at_index(&mut self, idx: usize, val: u8) { 
		self.store[idx] = val; 
	}
}


#[table(accessor = cornerpdb, public)] 
struct CornerPatternDatabase { 
	pdb_identity: Identity,
	pdb: Box<DbStorage>,
}

#[reducer(init)] 
pub fn init_cpdb(ctx: &ReducerContext) { 
	let mut cpdb: Box<DbStorage> = Box::new(DbStorage::new()); 
	let mut BFS = BreadthFirstCornerSearcher::new(); 
	BFS.perform_bfs(State { cp: vec![0,1,2,3,4,5,6,7], co: vec![0,0,0,0,0,0,0,0] }, &mut cpdb); 
	ctx.db.cornerpdb().insert(CornerPatternDatabase {
		pdb_identity: ctx.sender(),
		pdb: cpdb, 
	});
}

#[reducer] 
pub fn set_name(ctx: &ReducerContext, name: String) -> Result<(), String> { 
	let name = validate_name(name)?; 
	if let Some(cuber) = ctx.db.cuber().identity().find(ctx.sender()) {
		ctx.db.cuber().identity().update(Cuber { name: name, ..cuber }); 
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
		ctx.db.cuber().identity().update(Cuber { verified: status, ..cuber }); 
		Ok(())
	} else { 
		Err("Failed to set verified status for cuber".to_string())
	}
}

#[reducer] 
pub fn set_human_status(ctx: &ReducerContext, is_human: bool) -> Result<(), String> { 
	if let Some(cuber) = ctx.db.cuber().identity().find(ctx.sender()) { 
		ctx.db.cuber().identity().update(Cuber { is_human: is_human, ..cuber }); 
		Ok(())
 	} else { 
		 Err("Failed to set human status for cuber".to_string())
	 }
}

#[reducer] 
pub fn test_and_set_best_score(ctx: &ReducerContext, move_ct: u32, singmaster: String) -> Result<(), String> { 
	let singmaster = validate_singmaster(singmaster)?;
	if let Some(cuber) = ctx.db.cuber().identity().find(ctx.sender()) {
		let curr_score = cuber.best_score_movect; 
		if move_ct < curr_score { 
			ctx.db.cuber().identity().update(Cuber { 
				best_score_movect: move_ct, 
				best_score_singmaster: singmaster, 
			..cuber });
			Ok(()) 
		} else { 
			Err("Failed to set best score".to_string()) 
		}
	} else { 
		Err("Failed to set best score".to_string())
	}
}

// this is only a partial validation: it does not validate semantic consistency 
// (e.g., that a given move string actually produces a valid cube configuration) 
fn validate_singmaster(move_string: String) -> Result<String, String> { 
	if move_string.is_empty() { 
		Err("Move strings must not be empty".to_string())
	} else if move_string.chars().filter(|ch| {
			*ch != 'T' && *ch != 'B' &&
			*ch != 'R' && *ch != 'L' && 
			*ch != 'F' && *ch != 'P' && 
			*ch != '+' && *ch != '-' && 
			*ch != '2'}).collect::<Vec<_>>().len() > 0 { 
				Err("Move strings can only contain: T,B,R,L,F,P,+,-,2".to_string())
	} else { 
		Ok(move_string) 
	}
}

#[reducer] 
pub fn set_distance_to_solve(ctx: &ReducerContext, distance: u64) -> Result<(), String> { 
	if let Some(cuber) = ctx.db.cuber().identity().find(ctx.sender()) { 
		ctx.db.cuber().identity().update(Cuber { distance_to_solve: distance, ..cuber }); 
		Ok(())
	} else { 
		Err("Failed to set distance to solve for cuber".to_string())
	}
}