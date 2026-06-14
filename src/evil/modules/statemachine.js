import * as THREE from 'three';

export class InteractionState { 
    constructor(clickedOnPoint=null, 
                rotateAroundAxis=null, clickedOnFace=null, 
                clickedOnFacePlane=null, dragDir=null, 
                dragEndPoint=null, worldNormal=null) { 
        this.clickedOnPoint = clickedOnPoint; 
        this.dragEndPoint = dragEndPoint; 
        this.rotateAroundAxis = rotateAroundAxis; 
        this.clickedOnFace = clickedOnFace;  
        this.clickedOnFacePlane = clickedOnFacePlane; 
        this.dragDir = dragDir; 
        this.worldNormal = worldNormal;
        this.normalAxis = null;
        this.clickedOnCubeletPosition = null; 
        this.layerToRotate = null; 
        this.dragDistance= null; 
    }

    reset() {
        Object.entries(this).forEach(([key, value]) => {
            this[key] = null;
        });
    }
}

export class UserInteractionStateMachine {
    constructor() { 
        this.hovering = true; 
        this.picked = false; 
        this.clicking = false; 
        this.dragging = false; 
        this.animating = false; 
        this.stopped = false; 
    }

    reset() { 
        Object.entries(this).forEach(([key, value]) => { 
            if (value) { 
                this[key] = false;
            }
        }); 
    }

    update(action) { 
        switch (action) { 
            case "hovering":
                this.reset();
                this.hovering = true;
                break; 
            case "picked":
                this.reset();
                this.picked = true;
                break;
            case "clicking":
                this.reset();
                this.clicking = true;
                break;
            case "dragging":
                this.reset();
                this.dragging = true;
                break;
            case "animating":
                this.reset();
                this.animating = true;
                break;
            case "mouseup":
                this.reset();
                this.stopped = true;
                break;
            default:
                return;
        }
    }
}