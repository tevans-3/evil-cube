import * as THREE from 'three';

export class InteractionState { 
    constructor(mousePosition, clickedOnPoint=null, 
                rotateAroundAxis=null, clickedOnFace=null, 
                clickedOnFacePlane=null, dragDir=null, 
                dragEndPoint=null, worldNormal=null) { 
        this.mousePosition = mousePosition; 
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
    }

    reset() {
        Object.entries(this).forEach(([key, value]) => {
            this.key = null;
        });
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

    update(state, action) { 
        switch (action) { 
            case "hovering":
                this.wipeOldState();
                this.hovering = true;
                break; 
            case "clicking":
                this.wipeOldState();
                this.clicking = true;
                break;
            case "dragging":
                this.wipeOldState();
                this.dragging = true;
                break;
            case "animating":
                this.wipeOldState();
                this.animating = true;
                break;
            case "mouseup":
                this.wipeOldState();
                this.stopped = true;
                break;
            default:
                return;
        }
        this.interactionState = state; 
    }
}