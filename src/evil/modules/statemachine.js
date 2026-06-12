import * as THREE from 'three';

export class InteractionState { 
    constructor(mousePosition, clickedOnPoint=null, 
                rotateAroundAxis=null, clickedOnFace=null, 
                clickedOnFacePlane=null, dragDir=null) { 
        this.mousePosition = mousePosition; 
        this.clickedOnPoint = clickedOnPoint; 
        this.rotateAroundAxis = rotateAroundAxis; 
        this.clickedOnFace = clickedOnFace;  
        this.clickedOnFacePlane = clickedOnFacePlane; 
        this.dragDir = dragDir; 
    }
}

export class UserInteractionStateMachine {
    constructor(state) { 
        this.hovering = true; 
        this.clicking = false; 
        this.dragging = false; 
        this.animating = false; 
        this.stopped = false; 
        this.interactionState = state; 
    }

    wipeOldState() { 
        Object.entries(this).forEach(([key, value]) => { 
            if (value) { 
                this.key = false; 
            }
        }); 
    }

    update(state) { 
        switch (action) { 
            case "hovering":
                this.wipeOldState(); 
                this.hovering = true; 
            case "clicking":
                this.wipeOldState(); 
                this.clicking = true; 
            case "dragging": 
                this.wipeOldState(); 
                this.dragging = true; 
            case "animating": 
                this.wipeOldState(); 
                this.animating = true;  
            case "mouseup": 
                this.wipeOldState(); 
                this.stopped = true; 
            default:
                return;
        }
        this.interactionState = state; 
    }
}