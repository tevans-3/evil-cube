export var pickPosition = {x: 0, y: 0}; 

export function _principalComponent(v) { 
    var maxAxis = 'x', 
        max = Math.abs(v.x); 

    if (Math.abs(v.y) > max) { 
        maxAxis = 'y';
        max = Math.abs(v.y); 
    }

    if (Math.abs(v.z) > max) { 
        maxAxis = 'z'; 
        max = Math.abs(v.z); 
    }
    return maxAxis; 
}
