use spacetimedb::{table, reducer, Table, ReducerContext, Identity, Timestamp, 
					view, ViewContext, AnonymousViewContext, SpacetimeType}; 
use std::collections::VecDeque; 
use bit_set::BitSet; 

pub const UNVISITED: u32 = u32::MAX; 

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
	best_score_movect: u32, 
	best_score_singmaster: String,
	distance_to_solve: u64,
	state: Move, // we only care about the corners
}

#[reducer(client_connected)] 
pub fn client_connected(ctx: &ReducerContext) -> Result<(), String> { 
	ctx.db.cuber().insert(Cuber { 
		identity: ctx.sender, 
		verified: false, 
		is_human: true, 
		name: String::new(), 
		best_score_movect: 0, 
		best_score_singmaster: String::new(), 
		distance_to_solve: 88179840, 
		state: Move { cp: [0, 1, 2, 3, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] }, 
	}); 
	Ok(())
}

// the client will scramble the cube and then write the new corner positions using this reducer 
#[reducer] 
pub fn apply_move(ctx: &ReducerContext, m: Move) -> Result<(), String> { 
	if let Some(cuber) = ctx.db.cuber().identity().find(ctx.sender()) { 
		// TODO: generate PDB, wire up client, build leaderboard (it's just a subscriber, subscribed to an AnonymousViewContext) 
		ctx.db.cuber().identity().update(Cuber { state: update_state(cuber.state, m), ..cuber}); 
		// lookup corner state in PDB and update distance to solve so that subscriber scrambler 
		// is triggered if distance <= scramble_threshold 
		Ok(())
	} else { 
		Err("Failed to apply move".to_string()) 
	}
}

fn update_state(state: &Move, new: Move) -> Move {
	new_move: Move = Move { cp: [0,0,0,0,0,0,0,0], co: [0,0,0,0,0,0,0,0] }; 
	for i in range(0..8} { 
		new_move.cp[new.cp[i]] = (*state).cp[i]; 
		new_move.co[new.cp[i]] = ((*state).co[i] + new.co[i]) % 3;  
	}
	new_move
}

pub struct BreadthFirstCornerSearcher(identity_move: Move) { 
	move_store: [Move; 18],
	visited: u32,
	explored_moves: VecDeque<Move>,
}

impl BreadthFirstCornerSearcher { 
	pub fn new(&self) -> BreadthFirstCornerSearcher { 
		BreadthFirstCornerSearcher {
			visited: 0,
			explored_moves: VecDeque::<Move>::new(),
		}
	}

	pub fn perform_bfs(&mut self, identity_move: Move, corner: &mut db_storage) { 
		self.explored_moves.push_back(identity_move); 
		while self.explored_moves.is_empty() == false {
			let curr = self.explored_moves.pop_front(); 
			for mv in MOVES { 
				let new: Move = update_state(&curr, mv); 
				let new_slot_in_pdb = pdb.get_at_index(pdb.get_index(new)); 
				let current_dist = pb.get_at_index(pdb.get_index(curr)); 
				if new_slot_in_pdb == UNVISITED { 
					pdb.set_at_index(new_slot_in_pdb, current_dist + 1); 
					self.explored_moves.push_back(new); 
				}
			}
		}
	}
}

#[derive(SpacetimeType)]
pub struct DbStorage { 
	store: [u32; CORNER_CONFIGURATIONS_CT], 
} 

impl DbStorage { 
	pub fn new(&self) -> DbStorage { 
		DbStorage { 
			store = [UNVISITED; CORNER_CONFIGURATIONS_CT],
		}
	}

	fn rank(p: &[u8; 8]) -> u32 { 
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

	pub fn get_index(&self, new: Move) -> u64 { 
		let mut s: u32 = 
				new.co[1] as u32 * 729 + 
				new.co[2] as u32 * 243 + 
				new.co[3] as u32 *  81 + 
				new.co[4] as u32 *  27 +
				new.co[5] as u32 *   9 + 
				new.co[6] as u32 *   3 + 
				new.co[7]; 

		return self.rank(p) * 2187 + orientationNum;
	}

	pub fn get_at_index(&self, idx: u32) -> u32 { 
		self.store[idx]
	}

	pub fn set_at_index(&mut self, idx: u32, val: u32) { 
		self.store[idx] = val; 
	}
}


#[table(accessor = cornerpdb, public)] 
pub struct CornerPatternDatabase { 
	#[primary_key] 
	pdb_identity: Identity, 
	pdb: Box<DbStorage>,
}

#[reducer(init)] 
pub fn init_cpdb(ctx: &ReducerContext) { 
	let cpbd: DbStorage = Box::new(DbStorage::new()); 
	let BFS = BreadthFirstCornerSearcher::new(); 
	BFS.perform_bfs(Move { cp: [0,1,2,3,4,5,6,7], co: [0,0,0,0,0,0,0,0] }, &mut cpbd); 
	ctx.db.cornerpdb.insert(CornerPatternDatabase { 
		pbd: cpdb, 
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
pub fn test_and_set_best_score(ctx: &ReducerContext, move_ct: i32, singmaster: String) -> Result<(), String> { 
	let singmaster = validate_singmaster(singmaster)?;
	if let Some(cuber) = ctx.db.cuber().identity().find(ctx.sender()) {
		let curr_score = cuber.best_score_movect; 
		if curr_score < move_ct { 
			ctx.db.cuber().identity().update(Cuber { 
				best_score_movect: move_ct, 
				best_score_singmaster: singmaster, 
			..cuber });
			Ok(()) 
		} else { 
			Err("Failed to set best score".to_string()) 
		}
	}
}

// this is only a partial validation: it does not validate semantic consistency 
// (e.g., that a given move string actually produces a valid cube configuration) 
fn validate_singmaster(move_string: String) -> Result<String, String> { 
	if move_string.is_empty() { 
		Err("Move strings must not be empty".to_string())
	} else if move_string.chars().filter(|ch| {
			ch != 'T' && ch != 'B' &&
			ch != 'R' && ch != 'L' && 
			ch != 'F' && ch != 'P' && 
			ch != '+' && ch != '-' && 
			ch != '2'}).len() > 0 { 
				Err("Move strings can only contain: T,B,R,L,F,P,+,-,2".to_string())
	} else { 
		Ok(move_string) 
	}
}

#[reducer] 
pub fn set_distance_to_solve(ctx: &ReducerContext, distance: u64) -> Result<(), String> { 
	if let Some(cuber) = ctx.db.cuber().identity().find(ctx.sender()) { 
		ctx.db.cuber().identity().update(cuber { distance_to_solve: distance, ..cuber }); 
		Ok(())
	} else { 
		Err("Failed to set distance to solve for cuber".to_string())
	}
}