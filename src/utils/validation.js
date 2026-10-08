// Un texte valide : de type "string" et pas vide
export function isText(value) {
    if (typeof value !== 'string') {
        return false;
    }
    if (value.trim() === '') {
        return false;
    }
    return true;
}

// Une date valide : un texte que JavaScript sait lire comme une date
// Exemples valides : "2026-11-01T20:00:00Z", "2026-11-01"
export function isValidDate(value) {
    if (typeof value !== 'string') {
        return false;
    }
    // Date.parse renvoie NaN ("Not a Number") si le texte n'est pas une date
    if (Number.isNaN(Date.parse(value))) {
        return false;
    }
    return true;
}

// Un entier supérieur ou égal à 1 (1, 2, 3...). Refuse 0, -5, 2.5, "3"
export function isPositiveInteger(value) {
    return Number.isInteger(value) && value >= 1;
}