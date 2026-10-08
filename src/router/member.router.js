import { Router } from 'express';
import { db, getNextMemberId } from '../data/store.js';
import { removeRegistrationsOfCharacter } from '../services/registration.service.js';

const memberRouter = Router();

function findMember(id) {
    // L'id qui vient de l'URL est un texte ("2"), on le convertit en nombre (2)
    const idNumber = Number(id);

    // On parcourt le tableau des membres, un par un
    for (let i = 0; i < db.members.length; i++) {
        const member = db.members[i];

        // Si l'id du membre correspond, on le renvoie et la fonction s'arrête
        if (member.id === idNumber) {
            return member;
        }
    }
    // On a tout parcouru sans trouver : on renvoie "undefined" (= rien)
    return undefined;
}

function isValidPseudo(pseudo) {
    // Il doit être du texte (pas un nombre, pas vide de type, pas absent)
    if (typeof pseudo !== 'string') {
        return false;
    }

    // .trim() enlève les espaces au début et à la fin.
    // Si après ça il ne reste rien, le pseudo était vide ou rempli d'espaces.
    if (pseudo.trim() === '') {
        return false;
    }

    return true;
}

// "exceptId" sert à ignorer un membre : quand on modifie le membre 2,
// il ne doit pas être "en conflit" avec son propre pseudo.
function pseudoTaken(pseudo, exceptId) {
    // On compare en minuscules pour que "Cora" et "cora" soient considérés pareils
    const wanted = pseudo.toLowerCase();

    for (const member of db.members) {
        // Si c'est le membre à ignorer, on passe au suivant
        if (member.id === exceptId) {
            continue;
        }

        // Si un autre membre a le même pseudo, il est pris
        if (member.pseudo.toLowerCase() === wanted) {
            return true;
        }
    }

    // Personne n'a ce pseudo
    return false;
}

// Liste des membres
memberRouter.get('/members', (req, res) => {
    res.json(db.members);
});

// Détail d'un membre
memberRouter.get('/members/:id', (req, res) => {
    const member = findMember(req.params.id);
    if (member === undefined) {
        return res.status(404).json({ error: 'Membre introuvable' });
    }
    res.json(member);
});

// Créer un membre
memberRouter.post('/members', function (req, res) {
    // req.body contient le JSON envoyé par le client.
    // S'il n'y a pas de corps, req.body vaut undefined : on le remplace par un objet vide
    let body = req.body;
    if (body === undefined) {
        body = {};
    }
    const pseudo = body.pseudo; // on récupère le champ "pseudo"

    // 1. Vérification du format → 400 (requête incorrecte)
    if (!isValidPseudo(pseudo)) {
        return res.status(400).json({ error: 'pseudo requis' });
    }

    // 2. Vérification de l'unicité → 409 (conflit)
    // Pas d'exceptId ici : on crée un nouveau membre, personne à ignorer
    if (pseudoTaken(pseudo)) {
        return res.status(409).json({ error: 'Pseudo déjà utilisé' });
    }

    // 3. Tout est bon : on fabrique le nouveau membre
    const member = {
        id: getNextMemberId(),
        pseudo: pseudo,
    };

    // 4. On l'ajoute au tableau
    db.members.push(member);

    // 5. On répond 201 (créé) avec le membre créé
    res.status(201).json(member);
});

// Remplacer un membre
memberRouter.put('/members/:id', (req, res) => {
    const member = findMember(req.params.id);
    if (!member) return res.status(404).json({ error: 'Membre introuvable' });

    const { pseudo } = req.body ?? {};
    if (!isValidPseudo(pseudo)) return res.status(400).json({ error: 'pseudo requis' });
    if (pseudoTaken(pseudo, member.id)) return res.status(409).json({ error: 'Pseudo déjà utilisé' });

    member.pseudo = pseudo;
    res.json(member);
});

// Modifier partiellement un membre
memberRouter.patch('/members/:id', function (req, res) {
    const member = findMember(req.params.id);
    if (member === undefined) {
        return res.status(404).json({ error: 'Membre introuvable' });
    }

    let body = req.body;
    if (body === undefined) {
        body = {};
    }
    const pseudo = body.pseudo;

    // Différence avec PUT : le pseudo est facultatif.
    // On ne le vérifie et on ne le modifie que s'il est présent dans la requête.
    if (pseudo !== undefined) {
        if (!isValidPseudo(pseudo)) {
            return res.status(400).json({ error: 'pseudo invalide' });
        }
        if (pseudoTaken(pseudo, member.id)) {
            return res.status(409).json({ error: 'Pseudo déjà utilisé' });
        }
        member.pseudo = pseudo;
    }

    // Si rien n'était envoyé, on renvoie simplement le membre inchangé
    res.json(member);
});

// Supprimer un membre
memberRouter.delete('/members/:id', function (req, res) {
    const member = findMember(req.params.id);
    if (member === undefined) {
        return res.status(404).json({ error: 'Membre introuvable' });
    }

    // pour chaque personnage du membre, on supprime ses inscriptions
    for (const character of db.characters) {
        if (character.memberId === member.id) {
            removeRegistrationsOfCharacter(character.id);
        }
    }

    // on garde seulement les personnages qui n'appartiennent PAS à ce membre
    const remainingCharacters = [];
    for (let i = 0; i < db.characters.length; i++) {
        if (db.characters[i].memberId !== member.id) {
            remainingCharacters.push(db.characters[i]);
        }
    }
    db.characters = remainingCharacters;

    // Ensuite on supprime le membre
    const index = db.members.indexOf(member);
    db.members.splice(index, 1);

    res.status(204).send();
});

export default memberRouter;