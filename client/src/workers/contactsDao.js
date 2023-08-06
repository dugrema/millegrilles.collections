const CONST_TIMEOUT_CERTIFICAT = 2 * 60 * 1000

function build(workers) {

    // let cacheCertificatsMaitredescles = null

    return {
        // Recupere une liste de cles, les conserve dans le usagerDao (cache) si applicable
        getContacts() {
            return getContacts(workers)
        },
        // getCertificatsMaitredescles() {
        //     if(cacheCertificatsMaitredescles) return cacheCertificatsMaitredescles
        //     return getCertificatsMaitredescles(workers)
        //         .then(reponse=>{
        //             cacheCertificatsMaitredescles = reponse
        //             setTimeout(()=>{
        //                 cacheCertificatsMaitredescles = null
        //             }, CONST_TIMEOUT_CERTIFICAT)
        //             return reponse
        //           })
        // }
    }
}

export default build

async function getContacts(workers) {

    const { connexion } = workers
    const contacts = await connexion.chargerContacts()
    return contacts
}

// async function getCertificatsMaitredescles(workers) {
//     const { connexion } = workers
//     return connexion.getCertificatsMaitredescles()
// }
