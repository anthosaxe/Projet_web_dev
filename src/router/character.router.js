import { Router } from 'express';
import { db, getNextCharacterId } from '../data/store.js';
import { ROLES } from '../data/constants.js';
import { isText } from '../utils/validation.js';
import { removeRegistrationsOfCharacter } from '../services/registration.service.js';

const characterRouter = Router();

// Trouver un personnage par son id (même principe que findMember)
function findCharacter(id) {
    const idNumber = Number(id);

    for (let i = 0; i < db.characters.length; i++) {
        if (db.characters[i].id === idNumber) {
            return db.characters[i];
        }
    }
    return undefined;
}

// Le membre existe-t-il ? Sert à vérifier le champ "memberId".
// Renvoie true ou false.
function memberExists(memberId) {
    const idNumber = Number(memberId);

    for (let i = 0; i < db.members.length; i++) {
        if (db.members[i].id === idNumber) {
            return true;
        }
    }
    return false;
}

// Le rôle fait-il partie de la liste autorisée ? ('tank', 'healer', 'dps')
function isValidRole(role) {
    return ROLES.includes(role);
}

characterRouter.get('/characters', function (req, res) {
    // Par défaut on renvoie tous les personnages
    let result = db.characters;

    // Les paramètres après le "?" dans l'URL sont dans req.query.
    // Exemple : /characters?memberId=2  →  req.query.memberId vaut "2"
    if (req.query.memberId !== undefined) {
        const memberId = Number(req.query.memberId);
        const filtered = [];

        for (let i = 0; i < db.characters.length; i++) {
            if (db.characters[i].memberId === memberId) {
                filtered.push(db.characters[i]);
            }
        }
        result = filtered;
    }

    res.json(result);
});

characterRouter.get('/characters/:id', function (req, res) {
    const character = findCharacter(req.params.id);

    if (character === undefined) {
        return res.status(404).json({ error: 'Personnage introuvable' });
    }

    res.json(character);
});

characterRouter.post('/characters', function (req, res) {
    let body = req.body;
    if (body === undefined) {
        body = {};
    }
    const memberId = body.memberId;
    const name = body.name;
    const classe = body.classe;
    const role = body.role;

    // 1. Le membre propriétaire doit exister
    if (!memberExists(memberId)) {
        return res.status(400).json({ error: 'memberId invalide' });
    }

    // 2. Les autres champs doivent être valides
    if (!isText(name) || !isText(classe)) {
        return res.status(400).json({ error: 'name et classe requis' });
    }
    if (!isValidRole(role)) {
        return res.status(400).json({ error: 'role doit être : tank, healer ou dps' });
    }

    // 3. On crée le personnage
    // Number(memberId) pour stocker un nombre même si on a reçu "2"
    const character = {
        id: getNextCharacterId(),
        memberId: Number(memberId),
        name: name,
        classe: classe,
        role: role,
    };

    db.characters.push(character);
    res.status(201).json(character);
});

characterRouter.put('/characters/:id', function (req, res) {
    const character = findCharacter(req.params.id);
    if (character === undefined) {
        return res.status(404).json({ error: 'Personnage introuvable' });
    }

    let body = req.body;
    if (body === undefined) {
        body = {};
    }
    const memberId = body.memberId;
    const name = body.name;
    const classe = body.classe;
    const role = body.role;

    // Les mêmes vérifications que pour POST
    if (!memberExists(memberId)) {
        return res.status(400).json({ error: 'memberId invalide' });
    }
    if (!isText(name) || !isText(classe)) {
        return res.status(400).json({ error: 'name et classe requis' });
    }
    if (!isValidRole(role)) {
        return res.status(400).json({ error: 'role doit être : tank, healer ou dps' });
    }

    // On remplace TOUS les champs (sauf l'id, qui ne change jamais)
    character.memberId = Number(memberId);
    character.name = name;
    character.classe = classe;
    character.role = role;

    res.json(character);
});

characterRouter.patch('/characters/:id', function (req, res) {
    const character = findCharacter(req.params.id);
    if (character === undefined) {
        return res.status(404).json({ error: 'Personnage introuvable' });
    }

    let body = req.body;
    if (body === undefined) {
        body = {};
    }
    const memberId = body.memberId;
    const name = body.name;
    const classe = body.classe;
    const role = body.role;

    // D'abord on vérifie TOUS les champs présents,
    // pour ne rien modifier si l'un d'eux est invalide
    if (memberId !== undefined && !memberExists(memberId)) {
        return res.status(400).json({ error: 'memberId invalide' });
    }
    if (name !== undefined && !isText(name)) {
        return res.status(400).json({ error: 'name invalide' });
    }
    if (classe !== undefined && !isText(classe)) {
        return res.status(400).json({ error: 'classe invalide' });
    }
    if (role !== undefined && !isValidRole(role)) {
        return res.status(400).json({ error: 'role doit être : tank, healer ou dps' });
    }

    // Puis on applique uniquement ce qui a été envoyé
    if (memberId !== undefined) {
        character.memberId = Number(memberId);
    }
    if (name !== undefined) {
        character.name = name;
    }
    if (classe !== undefined) {
        character.classe = classe;
    }
    if (role !== undefined) {
        character.role = role;
    }

    res.json(character);
});

characterRouter.delete('/characters/:id', function (req, res) {
    const character = findCharacter(req.params.id);
    if (character === undefined) {
        return res.status(404).json({ error: 'Personnage introuvable' });
    }

    // on supprime ses inscriptions d'abord
    removeRegistrationsOfCharacter(character.id);

    const index = db.characters.indexOf(character);
    db.characters.splice(index, 1);

    res.status(204).send();
});

export default characterRouter;

