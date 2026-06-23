export const replay = (p: any) => {

}

export function ReplayButton<T>(arg: string, callback: any): Node {
    const button = document.createElement("button");
    button.textContent = "🎬";
    button.addEventListener('click', callback(arg)); 
    return button;
}