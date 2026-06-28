export function Card(id: string) { 
    const card = document.createElement("card");
    card.className = "card";
    card.id = id; 
    return card; 
}