const CONST_TIMEOUT_CERTIFICAT = 2 * 60 * 1000

function build(workers) {

    return {
        // Recupere une liste de cles, les conserve dans le usagerDao (cache) si applicable
        getContacts() {
            return getContacts(workers)
        },
        supprimerContacts(contactIds) {
            return supprimerContacts(workers, contactIds)
        },
        getPartagesUsager() {
            return getPartagesUsager(workers)
        },
        getPartagesContact() {
            return getPartagesContact(workers)
        },
    }
}

export default build

async function getContacts(workers) {
    const { connexion } = workers
    const contacts = await connexion.chargerContacts()
    return contacts
}

async function supprimerContacts(workers, contactIds) {
    if(typeof(contactIds) === 'string') contactIds = [contactIds]
    const { connexion } = workers
    return await connexion.supprimerContacts(contactIds)
}

async function getPartagesUsager(workers) {
    const { connexion } = workers
    const partages = await connexion.getPartagesUsager()
    return partages
}

async function getPartagesContact(workers) {
    const { connexion } = workers
    const partages = await connexion.getPartagesContact()
    return partages
}
