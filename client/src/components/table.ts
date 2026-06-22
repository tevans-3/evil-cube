export interface Column<T> { 
    header: string; 
    cell: (row: T) => string | Node; 
}

export function Table<T>(rows: T[], columns: Column<T>[]) { 
    const table = document.createElement("table"); 
    table.id = "leaderboard";
    const hrow = table.createTHead().insertRow(); 
    for (const col of columns) { 
        const th = document.createElement("th"); 
        th.textContent = col.header; 
        hrow.append(th); 
    }
    const body = table.createTBody(); 
    for (const row of rows) { 
        const tr = body.insertRow(); 
        for (const col of columns) { 
            const td = tr.insertCell();
            const content = col.cell(row); 
            if (typeof content == "string") td.textContent = content;
            else td.append(content); 
        }
    }
    return table; 
}