# evil-cube
A Rubik's cube that fights back.

[![Rust](https://github.com/tevans-3/evil-cube/actions/workflows/rust.yml/badge.svg)](https://github.com/tevans-3/evil-cube/actions/workflows/rust.yml)
[![CodeQL Advanced](https://github.com/tevans-3/evil-cube/actions/workflows/codeql.yml/badge.svg)](https://github.com/tevans-3/evil-cube/actions/workflows/codeql.yml)

## What is this? 
This is an adversarial Rubik's cube. As the tagline says, "a Rubik's cube that fights back." 

The cube monitors your progress. If you get too close to solving it, it scrambles itself. 

The scramble mechanic is basically toggled on or off based on skill level. If, like me, your only hope of solving a Rubik's cube involves a screwdriver, the cube will never need to fight back: it will let you flail and twist away in hopeless search of a solution. If, on the other hand, you actually know what you're doing, the cube will aggressively defy your attempts to unscramble it. 

It heuristically estimates your "distance to solved" using a corner pattern database lookup. This database is indexed using a unique hash of all 88 million corner permutations; each index points to an admissible lower bound on the number of moves needed to reach a solved state starting from that corner configuration. The database is constructed using a breadth-first search from the solved or identity state. 

There's a global leaderboard so that you can compare yourself to other cubers.  
