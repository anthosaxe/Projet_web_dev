import { Router } from 'express';
import { db, getNextRegistrationId } from '../data/store.js';
import { ROLES, REGISTRATION_STATUS } from '../data/constants.js';
import { findById } from '../utils/finders.js';
import {
    countActive,
    hasRoom,
    promoteWaitlist,
} from '../services/registration.service.js';

const registrationRouter = Router();

function isValidRole(role) {
    return ROLES.includes(role);
}

function isValidRegistrationStatus(status) {
    return REGISTRATION_STATUS.includes(status);
}

// Ce personnage est-il déjà inscrit à ce raid (inscription non refusée) ?
// exceptId : une inscription à ignorer (pour PUT)
function alreadyRegistered(raidId, characterId, exceptId) {
    for (const registration of db.registrations) {
        if (registration.id === exceptId) {
            continue;
        }
        if (
            registration.raidId === raidId &&
            registration.characterId === characterId &&
            registration.status !== 'refused'
        ) {
            return true;
        }
    }
    return false;
}

// Ajoute le nom du personnage et le pseudo du membre pour rendre la réponse lisible
function describeRegistration(registration) {
    const character = findById(db.characters, registration.characterId);
    let member = undefined;
    if (character !== undefined) {
        member = findById(db.members, character.memberId);
    }

    return {
        ...registration,
        characterName: character !== undefined ? character.name : undefined,
        memberPseudo: member !== undefined ? member.pseudo : undefined,
    };
}

registrationRouter.get('/registrations', function (req, res) {
    let result = db.registrations;

    if (req.query.raidId !== undefined) {
        const raidId = Number(req.query.raidId);
        const filtered = [];

        for (const registration of db.registrations) {
            if (registration.raidId === raidId) {
                filtered.push(registration);
            }
        }
        result = filtered;
    }

    // On enrichit chaque inscription avant de l'envoyer
    const described = [];
    for (const registration of result) {
        described.push(describeRegistration(registration));
    }
    res.json(described);
});

registrationRouter.get('/registrations/:id', function (req, res) {
    const registration = findById(db.registrations, req.params.id);

    if (registration === undefined) {
        return res.status(404).json({ error: 'Inscription introuvable' });
    }

    res.json(describeRegistration(registration));
});

registrationRouter.post('/registrations', function (req, res) {
    let body = req.body;
    if (body === undefined) {
        body = {};
    }

    // On retrouve le raid et le personnage à partir de leurs id
    const raid = findById(db.raids, body.raidId);
    const character = findById(db.characters, body.characterId);

    // 1. Les deux doivent exister
    if (raid === undefined || character === undefined) {
        return res.status(400).json({ error: 'raidId et characterId valides requis' });
    }

    // 2. Le rôle est facultatif : par défaut, celui du personnage
    let role = body.role;
    if (role === undefined) {
        role = character.role;
    }
    if (!isValidRole(role)) {
        return res.status(400).json({ error: 'role doit être : tank, healer ou dps' });
    }

    // 3. Les inscriptions doivent être ouvertes
    if (raid.status !== 'open') {
        return res.status(409).json({ error: 'Raid fermé aux inscriptions' });
    }

    // 4. Pas de doublon
    if (alreadyRegistered(raid.id, character.id)) {
        return res.status(409).json({ error: 'Personnage déjà inscrit à ce raid' });
    }

    // 5. Raid complet ? Liste d'attente. Sinon : en attente de validation.
    let status = 'pending';
    if (countActive(raid.id) >= raid.maxPlayers) {
        status = 'waitlist';
    }

    // 6. Création : le statut est décidé par le serveur, pas par le client
    const registration = {
        id: getNextRegistrationId(),
        raidId: raid.id,
        characterId: character.id,
        role: role,
        status: status,
        createdAt: new Date().toISOString(),
    };

    db.registrations.push(registration);
    res.status(201).json(registration);
});

registrationRouter.put('/registrations/:id', function (req, res) {
    const registration = findById(db.registrations, req.params.id);
    if (registration === undefined) {
        return res.status(404).json({ error: 'Inscription introuvable' });
    }

    let body = req.body;
    if (body === undefined) {
        body = {};
    }
    const raid = findById(db.raids, body.raidId);
    const character = findById(db.characters, body.characterId);
    const role = body.role;
    const status = body.status;

    if (raid === undefined || character === undefined) {
        return res.status(400).json({ error: 'raidId et characterId valides requis' });
    }
    if (!isValidRole(role)) {
        return res.status(400).json({ error: 'role doit être : tank, healer ou dps' });
    }
    if (!isValidRegistrationStatus(status)) {
        return res.status(400).json({ error: 'status doit être : pending, accepted, refused ou waitlist' });
    }

    // Doublon avec une AUTRE inscription (sauf si on la passe en "refused")
    if (alreadyRegistered(raid.id, character.id, registration.id) && status !== 'refused') {
        return res.status(409).json({ error: 'Personnage déjà inscrit à ce raid' });
    }

    // Reste-t-il de la place pour ce nouveau statut ?
    if (!hasRoom(raid, registration, status)) {
        return res.status(409).json({ error: 'Raid complet' });
    }

    // On retient l'ancien raid : si l'inscription le quitte, sa liste d'attente doit avancer
    const previousRaid = findById(db.raids, registration.raidId);

    registration.raidId = raid.id;
    registration.characterId = character.id;
    registration.role = role;
    registration.status = status;

    promoteWaitlist(previousRaid);
    promoteWaitlist(raid);

    res.json(registration);
});

registrationRouter.patch('/registrations/:id', function (req, res) {
    const registration = findById(db.registrations, req.params.id);
    if (registration === undefined) {
        return res.status(404).json({ error: 'Inscription introuvable' });
    }

    let body = req.body;
    if (body === undefined) {
        body = {};
    }
    const role = body.role;
    const status = body.status;

    if (role !== undefined && !isValidRole(role)) {
        return res.status(400).json({ error: 'role doit être : tank, healer ou dps' });
    }
    if (status !== undefined && !isValidRegistrationStatus(status)) {
        return res.status(400).json({ error: 'status doit être : pending, accepted, refused ou waitlist' });
    }

    // Si on change le statut, il faut qu'il reste de la place
    const raid = findById(db.raids, registration.raidId);
    if (status !== undefined && !hasRoom(raid, registration, status)) {
        return res.status(409).json({ error: 'Raid complet' });
    }

    if (role !== undefined) {
        registration.role = role;
    }
    if (status !== undefined) {
        registration.status = status;
    }

    // Si on vient de refuser quelqu'un, une place s'est libérée
    promoteWaitlist(raid);

    res.json(registration);
});

registrationRouter.delete('/registrations/:id', function (req, res) {
    const registration = findById(db.registrations, req.params.id);
    if (registration === undefined) {
        return res.status(404).json({ error: 'Inscription introuvable' });
    }

    const index = db.registrations.indexOf(registration);
    db.registrations.splice(index, 1);

    // Une place est libérée : la liste d'attente avance
    promoteWaitlist(findById(db.raids, registration.raidId));

    res.status(204).send();
});

export default registrationRouter;