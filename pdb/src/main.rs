use std::collections::VecDeque; 
use std::fs; 

pub const UNVISITED: u8 = u8::MAX; 

pub const CORNER_CONFIGURATIONS_CT: u32 = 88179840;

// cp[i] - the piece in slot i moves to this slot; co[i] - the twist (mod 3) it gains 
#[derive(Clone, Copy)]
pub struct Move { pub cp: [u8; 8], pub co: [u8; 8] }

#[derive(Clone, Debug)] 
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

	pub fn perform_bfs(&mut self, identity_state: State, pdb: &mut Box<DbStorage>) { 
		self.explored_moves.push_back(identity_state.clone()); 
		pdb.set_at_index(pdb.get_index(&identity_state).try_into().unwrap(), 0); 
		while !self.explored_moves.is_empty() {
			let curr = self.explored_moves.pop_front().unwrap(); 
			for mv in MOVES {
				let new: State = update_state(&curr, mv); 
				let new_slot_in_pdb = pdb.get_at_index(pdb.get_index(&new).try_into().unwrap()) as u8; 
				let current_dist = pdb.get_at_index(pdb.get_index(&curr).try_into().unwrap());
                if current_dist >= 8 { self.explored_moves.clear(); break; } 
				if new_slot_in_pdb == UNVISITED { 
					pdb.set_at_index(pdb.get_index(&new).try_into().unwrap(), 
							(current_dist + 1).try_into().unwrap());
					self.explored_moves.push_back(new); 
				}
			}
		}
	}
}

#[derive(Clone)]
pub struct DbStorage { 
	store: Vec<u8>, 
} 

impl Default for DbStorage { 
    fn default() -> Self { 
        Self::new() 
    }
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

		DbStorage::rank(&new.cp) * 2187 + s
	}

	pub fn get_at_index(&self, idx: usize) -> u32 { 
		self.store[idx].into()
	}

	pub fn set_at_index(&mut self, idx: usize, val: u8) { 
		self.store[idx] = val; 
	}
}


pub fn generate_cpdb() -> std::io::Result<()> {
    println!("gen started!"); 
	let mut cpdb: Box<DbStorage> = Box::default();
	let mut bfs = BreadthFirstCornerSearcher::new();
    let state = State { cp: vec![0,1,2,3,4,5,6,7], co: vec![0,0,0,0,0,0,0,0] }; 
    bfs.perform_bfs(state, &mut cpdb); 
    fs::write("pruned_cpdb_d6.bin", cpdb.store
        .into_iter()
        .filter(|&x| x <= 6)
        .collect::<Vec<u8>>())?;
    println!("gen finished"); 
    Ok(())
}

fn main() -> std::io::Result<()> { 
    generate_cpdb()
}
