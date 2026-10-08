import { Router } from 'express';
import { db, getNextRaidId } from '../data/store.js';
import { RAID_STATUS } from '../data/constants.js';
import { isText, isValidDate, isPositiveInteger } from '../utils/validation.js';
import { promoteWaitlist } from '../services/registration.service.js';

const raidRouter = Router();

// Trouver un raid par son id
function findRaid(id) {
    const idNumber = Number(id);

    for (let i = 0; i < db.raids.length; i++) {
        if (db.raids[i].id === idNumber) {
            return db.raids[i];
        }
    }
    return undefined;
}

// Le statut fait-il partie de la liste autorisée ? ('open', 'closed', 'done')
function isValidRaidStatus(status) {
    return RAID_STATUS.includes(status);
}

raidRouter.get('/raids', function (req, res) {
    res.json(db.raids);
});

raidRouter.get('/raids/:id', function (req, res) {
    const raid = findRaid(req.params.id);

    if (raid === undefined) {
        return res.status(404).json({ error: 'Raid introuvable' });
    }

    res.json(raid);
});

raidRouter.post('/raids', function (req, res) {
    let body = req.body;
    if (body === undefined) {
        body = {};
    }
    const title = body.title;
    const date = body.date;
    const maxPlayers = body.maxPlayers;

    // Champs facultatifs : on leur donne une valeur par défaut s'ils sont absents
    let description = body.description;
    if (description === undefined) {
        description = '';
    }
    let status = body.status;
    if (status === undefined) {
        status = 'open';
    }

    // Vérifications → 400 si quelque chose ne va pas
    if (!isText(title)) {
        return res.status(400).json({ error: 'title requis' });
    }
    if (!isValidDate(date)) {
        return res.status(400).json({ error: 'date requise (format ISO, ex : 2026-11-01T20:00:00Z)' });
    }
    if (!isPositiveInteger(maxPlayers)) {
        return res.status(400).json({ error: 'maxPlayers doit être un entier supérieur ou égal à 1' });
    }
    if (!isValidRaidStatus(status)) {
        return res.status(400).json({ error: 'status doit être : open, closed ou done' });
    }

    // Création
    // new Date(date).toISOString() uniformise le format de la date
    const raid = {
        id: getNextRaidId(),
        title: title,
        description: description,
        date: new Date(date).toISOString(),
        maxPlayers: maxPlayers,
        status: status,
    };

    db.raids.push(raid);
    res.status(201).json(raid);
});

raidRouter.put('/raids/:id', function (req, res) {
    const raid = findRaid(req.params.id);
    if (raid === undefined) {
        return res.status(404).json({ error: 'Raid introuvable' });
    }

    let body = req.body;
    if (body === undefined) {
        body = {};
    }
    const title = body.title;
    const date = body.date;
    const maxPlayers = body.maxPlayers;
    const status = body.status;

    // La description reste facultative : vide si absente
    let description = body.description;
    if (description === undefined) {
        description = '';
    }

    if (!isText(title)) {
        return res.status(400).json({ error: 'title requis' });
    }
    if (!isValidDate(date)) {
        return res.status(400).json({ error: 'date requise (format ISO)' });
    }
    if (!isPositiveInteger(maxPlayers)) {
        return res.status(400).json({ error: 'maxPlayers doit être un entier supérieur ou égal à 1' });
    }
    if (!isValidRaidStatus(status)) {
        return res.status(400).json({ error: 'status requis : open, closed ou done' });
    }

    // On remplace tous les champs (sauf l'id)
    raid.title = title;
    raid.description = description;
    raid.date = new Date(date).toISOString();
    raid.maxPlayers = maxPlayers;
    raid.status = status;
    
    promoteWaitlist(raid);

    res.json(raid);
});

raidRouter.patch('/raids/:id', function (req, res) {
    const raid = findRaid(req.params.id);
    if (raid === undefined) {
        return res.status(404).json({ error: 'Raid introuvable' });
    }

    let body = req.body;
    if (body === undefined) {
        body = {};
    }
    const title = body.title;
    const description = body.description;
    const date = body.date;
    const maxPlayers = body.maxPlayers;
    const status = body.status;

    // On vérifie d'abord tous les champs présents...
    if (title !== undefined && !isText(title)) {
        return res.status(400).json({ error: 'title invalide' });
    }
    if (date !== undefined && !isValidDate(date)) {
        return res.status(400).json({ error: 'date invalide' });
    }
    if (maxPlayers !== undefined && !isPositiveInteger(maxPlayers)) {
        return res.status(400).json({ error: 'maxPlayers invalide' });
    }
    if (status !== undefined && !isValidRaidStatus(status)) {
        return res.status(400).json({ error: 'status doit être : open, closed ou done' });
    }

    // ... puis on applique uniquement ce qui a été envoyé
    if (title !== undefined) {
        raid.title = title;
    }
    if (description !== undefined) {
        raid.description = description;
    }
    if (date !== undefined) {
        raid.date = new Date(date).toISOString();
    }
    if (maxPlayers !== undefined) {
        raid.maxPlayers = maxPlayers;
    }
    if (status !== undefined) {
        raid.status = status;
    }

    promoteWaitlist(raid);

    res.json(raid);
});

raidRouter.delete('/raids/:id', function (req, res) {
    const raid = findRaid(req.params.id);
    if (raid === undefined) {
        return res.status(404).json({ error: 'Raid introuvable' });
    }

    // on garde seulement les inscriptions des AUTRES raids
    const remaining = [];
    for (const registration of db.registrations) {
        if (registration.raidId !== raid.id) {
            remaining.push(registration);
        }
    }
    db.registrations = remaining;

    const index = db.raids.indexOf(raid);
    db.raids.splice(index, 1);

    res.status(204).send();
});

export default raidRouter;