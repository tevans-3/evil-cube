# evil-cube
A Rubik's cube that fights back.

[![Rust](https://github.com/tevans-3/evil-cube/actions/workflows/rust.yml/badge.svg)](https://github.com/tevans-3/evil-cube/actions/workflows/rust.yml)
[![CodeQL Advanced](https://github.com/tevans-3/evil-cube/actions/workflows/codeql.yml/badge.svg)](https://github.com/tevans-3/evil-cube/actions/workflows/codeql.yml)

## What is this? 
This is an adversarial Rubik's cube. As the tagline says, "a Rubik's cube that fights back." 

The cube monitors your progress. If you get too close to solving it, it scrambles itself. 

The scramble mechanic is basically toggled on or off based on skill level. If, like me, your only hope of solving a Rubik's cube involves a screwdriver, the cube will never need to fight back: it will let you flail and twist away in hopeless search of a solution. If, on the other hand, you actually know what you're doing, the cube will aggressively defy your attempts to unscramble it. 

It heuristically estimates your "distance to solved" using a corner pattern database lookup. This database is indexed using a unique hash of all 88 million corner permutations; each index points to an admissible lower bound on the number of moves needed to reach a solved state starting from that corner configuration. The database is constructed using a breadth-first search from the solved or identity state. 

## Players Should Know 
The scrambler is assigned a fixed budget of 2 scrambles per 60 seconds. So you have to go fast.  

A corner pattern database provides an admissible lower bound, which means that, given a certain permutation and orientation of corner cubies which indexes to a distance estimate d, the true number of moves needed to solve the cube is at least d, or `true_distance >= distance_returned_by_cpdb_lookup`. 

This has drawbacks. If you solve the corners first, you might be far away from actually solving the cube, but the scrambler won't know that. This could be addressed with heuristics, or by adding edge pattern databases. If I were a carpenter, I'd hammer on my piglet and build an edge pattern database, too. But I'm not a carpenter, and I don't own a prosthetic forehead. I have to live and be satisfied with my real head, such as it is.  

## Notes
The corner pattern database doesn't actually store all 88 million corner states, or 88MB (since each state is one byte, a `Vec<u8>`). Instead, because we're only interested in a lower bound, we can prune the database, removing all values with a key greater than a specific threshold, dramatically reducing storage size. The threshold I used, basically arbitrarily, is d <= 6, which produced a 5MB binary file. 

I decided against building server-side validation. This is ultimately just a silly game: an authoritative server adds complexity (and performance impacts from network round trips) without adding value. Also, I kind of just wanted to ship a MVP and move onto other projects, without carrying the crippling guilt of leaving this unfinished. 

It was very exciting to see that my CPDB-generation BFS actually worked. 
