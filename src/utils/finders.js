// list = le tableau où chercher (db.raids, db.characters...)
export function findById(list, id) {
    const idNumber = Number(id);

    for (let i = 0; i < list.length; i++) {
        if (list[i].id === idNumber) {
            return list[i];
        }
    }
    return undefined;
}