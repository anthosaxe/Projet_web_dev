import { db } from '../data/store.js';
import { findById } from '../utils/finders.js';

// Une inscription "occupe une place" si elle est en attente ou acceptée.
// Une inscription refusée ou en liste d'attente n'occupe pas de place.
export function isActive(status) {
    return status === 'pending' || status === 'accepted';
}

// Combien de places sont occupées dans ce raid ?
// exceptRegistrationId (facultatif) : une inscription à ne pas compter
// (utile quand on modifie une inscription existante)
export function countActive(raidId, exceptRegistrationId) {
    let count = 0;

    for (const registration of db.registrations) {
        if (registration.raidId !== raidId) {
            continue; // autre raid : on ignore
        }
        if (registration.id === exceptRegistrationId) {
            continue; // l'inscription à ignorer
        }
        if (isActive(registration.status)) {
            count = count + 1;
        }
    }
    return count;
}

// Y a-t-il de la place pour donner ce nouveau statut à cette inscription ?
// Si le nouveau statut n'occupe pas de place (refused, waitlist), c'est toujours possible.
export function hasRoom(raid, registration, newStatus) {
    if (!isActive(newStatus)) {
        return true;
    }
    return countActive(raid.id, registration.id) < raid.maxPlayers;
}

// Quand une place se libère : on fait monter la liste d'attente.
export function promoteWaitlist(raid) {
    if (raid === undefined) {
        return;
    }

    // Le tableau est dans l'ordre d'arrivée : la plus ancienne inscription passe en premier
    for (const registration of db.registrations) {
        if (registration.raidId !== raid.id || registration.status !== 'waitlist') {
            continue;
        }

        // Plus de place : on arrête
        if (countActive(raid.id) >= raid.maxPlayers) {
            break;
        }

        registration.status = 'pending';
    }
}

// Supprime toutes les inscriptions d'un personnage,
// puis fait avancer la liste d'attente des raids concernés.
export function removeRegistrationsOfCharacter(characterId) {
    const affectedRaidIds = [];
    const remaining = [];

    for (const registration of db.registrations) {
        if (registration.characterId === characterId) {
            affectedRaidIds.push(registration.raidId); // on note le raid touché
        } else {
            remaining.push(registration); // on garde les autres
        }
    }
    db.registrations = remaining;

    for (const raidId of affectedRaidIds) {
        promoteWaitlist(findById(db.raids, raidId));
    }
}