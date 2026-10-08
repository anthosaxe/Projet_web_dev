export const db = {
    members: [
        { id: 1, pseudo: 'Aria' },
        { id: 2, pseudo: 'Borin' },
    ],
    characters: [
        { id: 1, memberId: 1, name: 'Ariastorm', classe: 'Mage', role: 'dps' },
        { id: 2, memberId: 2, name: 'Borinshield', classe: 'Guerrier', role: 'tank' },
    ],
    raids: [
        {
            id: 1,
            title: 'Donjon du Dragon',
            description: 'Raid de découverte',
            date: '2026-11-01T20:00:00.000Z',
            maxPlayers: 3,
            status: 'open',
        },
    ],

    registrations: [],
};

let nextMemberId = 3;
export function getNextMemberId() {
    const id = nextMemberId;
    nextMemberId = nextMemberId + 1;
    return id;
}

let nextCharacterId = 3;
export function getNextCharacterId() {
    const id = nextCharacterId;
    nextCharacterId = nextCharacterId + 1;
    return id;
}

let nextRaidId = 2;
export function getNextRaidId() {
    const id = nextRaidId;
    nextRaidId = nextRaidId + 1;
    return id;
}

let nextRegistrationId = 1;
export function getNextRegistrationId() {
    const id = nextRegistrationId;
    nextRegistrationId = nextRegistrationId + 1;
    return id;
}