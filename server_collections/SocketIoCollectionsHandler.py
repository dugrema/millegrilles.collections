import asyncio
import datetime
import json
import logging
import uuid

import pytz

from millegrilles_messages.messages import Constantes
from millegrilles_web.SocketIoHandler import SocketIoHandler, ErreurAuthentificationMessage
from millegrilles_web.JwtUtils import creer_token_fichier
from server_collections import Constantes as ConstantesCollections


class SocketIoCollectionsHandler(SocketIoHandler):

    def __init__(self, app, stop_event: asyncio.Event):
        self.__logger = logging.getLogger(__name__ + '.' + self.__class__.__name__)
        super().__init__(app, stop_event)

    async def _preparer_socketio_events(self):
        await super()._preparer_socketio_events()

        # Requetes
        self._sio.on('getDocuments', handler=self.requete_documents)
        self._sio.on('getFavoris', handler=self.requete_favoris)
        self._sio.on('getCorbeille', handler=self.requete_corbeille)
        self._sio.on('getCollection', handler=self.requete_collection)
        self._sio.on('getRecents', handler=self.requete_recents)
        self._sio.on('getClesFichiers', handler=self.requete_cles_fichiers)
        self._sio.on('rechercheIndex', handler=self.requete_recherche_index)
        self._sio.on('syncCollection', handler=self.requete_sync_collection)
        self._sio.on('syncRecents', handler=self.requete_sync_recents)
        self._sio.on('syncCorbeille', handler=self.requete_sync_corbeille)
        self._sio.on('requeteJobsVideo', handler=self.requete_jobs_video)
        self._sio.on('chargerContacts', handler=self.requete_contacts)
        self._sio.on('getPartagesUsager', handler=self.requete_partages_usager)
        self._sio.on('getPartagesContact', handler=self.requete_partages_contact)
        self._sio.on('getInfoStatistiques', handler=self.requete_info_statistiques)
        self._sio.on('getStructureRepertoire', handler=self.requete_structure_repertoire)
        self._sio.on('getBatchUpload', handler=self.requete_batch_upload)
        self._sio.on('getPermissionCles', handler=self.requete_permission_cles)
        self._sio.on('getSousRepertoires', handler=self.get_sous_repertoires)

        # Commandes
        self._sio.on('creerCollection', handler=self.creer_collection)
        self._sio.on('changerFavoris', handler=self.changer_favoris)
        self._sio.on('retirerDocuments', handler=self.retirer_documents)
        self._sio.on('supprimerDocuments', handler=self.supprimer_documents)
        self._sio.on('archiverDocuments', handler=self.archiver_documents)
        self._sio.on('decrireFichier', handler=self.decrire_fichier)
        self._sio.on('decrireCollection', handler=self.decrire_collection)
        self._sio.on('recupererDocumentsV2', handler=self.recuperer_documents_v2)
        self._sio.on('copierVersCollection', handler=self.copier_vers_collection)
        self._sio.on('deplacerFichiersCollection', handler=self.decplacer_fichiers_collection)
        self._sio.on('transcoderVideo', handler=self.transcoder_video)
        self._sio.on('ajouterFichier', handler=self.ajouter_fichier)
        self._sio.on('supprimerVideo', handler=self.supprimer_video)
        self._sio.on('creerTokenStream', handler=self.creer_token_stream)
        self._sio.on('completerPreviews', handler=self.completer_previews)
        self._sio.on('supprimerJobVideo', handler=self.supprimer_job_video)
        self._sio.on('ajouterContactLocal', handler=self.ajouter_contact_local)
        self._sio.on('supprimerContacts', handler=self.supprimer_contacts)
        self._sio.on('partagerCollections', handler=self.partager_collections)
        self._sio.on('supprimerPartageUsager', handler=self.supprimer_partage_usager)
        self._sio.on('indexerContenu', handler=self.indexer_contenu)

        # Listeners
        self._sio.on('enregistrerCallbackMajCollection', handler=self.ecouter_maj_collection)
        self._sio.on('retirerCallbackMajCollection', handler=self.retirer_maj_collection)
        self._sio.on('enregistrerCallbackMajContenuCollection', handler=self.ecouter_maj_contenu_collection)
        self._sio.on('retirerCallbackMajContenuCollection', handler=self.retirer_maj_contenu_collection)
        self._sio.on('enregistrerCallbackTranscodageVideo', handler=self.ecouter_transcodage_video)
        self._sio.on('retirerCallbackTranscodageVideo', handler=self.retirer_transcodage_video)

    @property
    def exchange_default(self):
        return ConstantesCollections.EXCHANGE_DEFAUT

    async def requete_documents(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           ConstantesCollections.NOM_DOMAINE, 'documentsParTuuid')

    async def requete_favoris(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           ConstantesCollections.NOM_DOMAINE, 'favoris')

    async def requete_corbeille(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           ConstantesCollections.NOM_DOMAINE, 'getCorbeille')

    async def requete_collection(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           ConstantesCollections.NOM_DOMAINE, 'contenuCollection')

    async def requete_recents(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           ConstantesCollections.NOM_DOMAINE, 'activiteRecente')

    async def requete_cles_fichiers(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           Constantes.DOMAINE_MAITRE_DES_CLES, 'dechiffrage')

    async def requete_recherche_index(self, sid: str, message: dict):
        # return await self.executer_requete(sid, message,
        #                                    ConstantesCollections.DOMAINE_SOLR_RELAI, 'fichiers')
        return await self.executer_requete(sid, message,
                                           Constantes.DOMAINE_GROS_FICHIERS, 'rechercheIndex')

    async def requete_sync_collection(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           ConstantesCollections.NOM_DOMAINE, 'syncCollection')

    async def requete_sync_recents(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           ConstantesCollections.NOM_DOMAINE, 'syncRecents')

    async def requete_sync_corbeille(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           ConstantesCollections.NOM_DOMAINE, 'syncCorbeille')

    async def requete_jobs_video(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           ConstantesCollections.NOM_DOMAINE, 'requeteJobsVideo')

    async def requete_contacts(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           ConstantesCollections.NOM_DOMAINE, 'chargerContacts')

    async def requete_partages_usager(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           ConstantesCollections.NOM_DOMAINE, 'getPartagesUsager')

    async def requete_partages_contact(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           ConstantesCollections.NOM_DOMAINE, 'getPartagesContact')

    async def requete_info_statistiques(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           ConstantesCollections.NOM_DOMAINE, 'getInfoStatistiques')

    async def requete_structure_repertoire(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           ConstantesCollections.NOM_DOMAINE, 'getStructureRepertoire')

    async def requete_batch_upload(self, sid: str, message: dict):
        async with self._sio.session(sid) as session:
            try:
                enveloppe = await self.authentifier_message(session, message)
            except ErreurAuthentificationMessage as e:
                return self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, {'ok': False, 'err': str(e)})[0]

        user_id = enveloppe.get_user_id
        cle_certificat = self.etat.clecertificat

        # Signer un token JWT
        expiration = datetime.datetime.now(tz=pytz.UTC) + datetime.timedelta(days=1)
        uuid_batch = str(uuid.uuid4())
        token = creer_token_fichier(cle_certificat,
                                    issuer='collections', user_id=user_id, fuuid=uuid_batch, expiration=expiration)

        return {'token': token, 'batchId': uuid_batch}

    async def requete_permission_cles(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           ConstantesCollections.NOM_DOMAINE, 'getClesFichiers')

    # Commandes

    async def creer_collection(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'nouvelleCollection')

    async def changer_favoris(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'changerFavoris')

    async def retirer_documents(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'retirerDocumentsCollection')

    async def supprimer_documents(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'supprimerDocuments')

    async def archiver_documents(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'archiverDocuments')

    async def decrire_fichier(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'decrireFichier')

    async def decrire_collection(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'decrireCollection')

    async def recuperer_documents_v2(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'recupererDocumentsV2')

    async def copier_vers_collection(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'ajouterFichiersCollection')

    async def decplacer_fichiers_collection(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'deplacerFichiersCollection')

    async def transcoder_video(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'transcoderVideo')

    async def ajouter_fichier(self, sid: str, message: dict):
        return await self.executer_commande(
            sid, message, ConstantesCollections.NOM_DOMAINE, 'nouvelleVersion')

    async def supprimer_video(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'supprimerVideo')

    async def creer_token_stream(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           ConstantesCollections.NOM_DOMAINE, 'getJwtStreaming')

    async def get_sous_repertoires(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           ConstantesCollections.NOM_DOMAINE, 'getSousRepertoires')

    async def completer_previews(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'completerPreviews')

    async def supprimer_job_video(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'supprimerJobVideo')

    async def ajouter_contact_local(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'ajouterContactLocal')

    async def supprimer_contacts(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'supprimerContacts')

    async def partager_collections(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'partagerCollections')

    async def supprimer_partage_usager(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'supprimerPartageUsager')

    async def indexer_contenu(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'indexerContenu')

    # Listeners

    async def ecouter_maj_collection(self, sid: str, message: dict):
        async with self._sio.session(sid) as session:
            try:
                enveloppe = await self.authentifier_message(session, message)
            except ErreurAuthentificationMessage as e:
                return self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, {'ok': False, 'err': str(e)})[0]

        contenu = json.loads(message['contenu'])
        cuuid = contenu['cuuid']
        contact_id = contenu.get('contact_id')
        user_id = enveloppe.get_user_id

        # Verifier si l'usager a un acces au cuuid demande via le partage
        requete = {'tuuids': [cuuid], 'contact_id': contact_id, 'user_id': user_id}
        action = 'verifierAccesTuuids'
        domaine = Constantes.DOMAINE_GROS_FICHIERS

        user_id_subscribe = user_id

        try:
            producer = await asyncio.wait_for(self.etat.producer_wait(), timeout=2)
        except asyncio.TimeoutError:
            # MQ non disponible, abort
            raise ErreurAuthentificationMessage('Acces refuse au repertoire partage (erreur temporaire)')
        else:
            reponse = await producer.executer_requete(requete, domaine=domaine, action=action,
                                                      exchange=Constantes.SECURITE_PRIVE)
            if reponse.parsed.get('ok') is False:
                raise ErreurAuthentificationMessage('Acces refuse au repertoire partage (erreur requete)')

            if reponse.parsed.get('acces_tous') is not True:
                raise ErreurAuthentificationMessage('Acces refuse au repertoire partage (contact_id/cuuid refuse')

            # # User effectif (via contact_id)
            user_id_subscribe = reponse.parsed['user_id']

        exchanges = [Constantes.SECURITE_PRIVE]
        routing_keys = [f'evenement.GrosFichiers.{cuuid}.majCollection']
        self.__logger.debug("ecouter_maj_collection sur %s" % routing_keys)
        reponse = await self.subscribe(sid, message, routing_keys, exchanges, enveloppe=enveloppe)
        reponse_signee, correlation_id = self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, reponse)

        return reponse_signee

    async def retirer_maj_collection(self, sid: str, message: dict):
        async with self._sio.session(sid) as session:
            try:
                enveloppe = await self.authentifier_message(session, message)
            except ErreurAuthentificationMessage as e:
                return self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, {'ok': False, 'err': str(e)})[0]

        contenu = json.loads(message['contenu'])
        cuuid = contenu['cuuid']

        exchanges = [Constantes.SECURITE_PRIVE]
        routing_keys = [f'evenement.GrosFichiers.{cuuid}.majCollection']
        self.__logger.debug("retirer_maj_collection sur %s" % routing_keys)
        reponse = await self.unsubscribe(sid, message, routing_keys, exchanges)
        reponse_signee, correlation_id = self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, reponse)

        return reponse_signee

    async def ecouter_maj_contenu_collection(self, sid: str, message: dict):
        async with self._sio.session(sid) as session:
            try:
                enveloppe = await self.authentifier_message(session, message)
            except ErreurAuthentificationMessage as e:
                return self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, {'ok': False, 'err': str(e)})[0]

        contenu = json.loads(message['contenu'])
        cuuid = contenu['cuuid']
        contact_id = contenu.get('contact_id')
        user_id = enveloppe.get_user_id

        # Verifier si l'usager a un acces au cuuid demande via le partage
        requete = {'tuuids': [cuuid], 'contact_id': contact_id, 'user_id': user_id}
        action = 'verifierAccesTuuids'
        domaine = Constantes.DOMAINE_GROS_FICHIERS

        try:
            producer = await asyncio.wait_for(self.etat.producer_wait(), timeout=2)
        except asyncio.TimeoutError:
            # MQ non disponible, abort
            raise ErreurAuthentificationMessage('Acces refuse au repertoire partage (erreur temporaire)')
        else:
            reponse = await producer.executer_requete(requete, domaine=domaine, action=action,
                                                      exchange=Constantes.SECURITE_PRIVE)
            if reponse.parsed.get('ok') is False:
                raise ErreurAuthentificationMessage('Acces refuse au repertoire partage (erreur requete)')

            if cuuid != user_id and reponse.parsed.get('acces_tous') is not True:
                raise ErreurAuthentificationMessage('Acces refuse au repertoire partage (contact_id/cuuid refuse')

            if contact_id is not None:
                # Utiliser le user_id qui correspond au contact_id
                user_id = reponse.parsed['user_id']

        exchanges = [Constantes.SECURITE_PRIVE]
        routing_keys = [
            f'evenement.GrosFichiers.{cuuid}.majContenuCollection'
        ]
        reponse = await self.subscribe(sid, message, routing_keys, exchanges, enveloppe=enveloppe, user_id=user_id)
        reponse_signee, correlation_id = self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, reponse)

        return reponse_signee

    async def retirer_maj_contenu_collection(self, sid: str, message: dict):
        async with self._sio.session(sid) as session:
            try:
                enveloppe = await self.authentifier_message(session, message)
            except ErreurAuthentificationMessage as e:
                return self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, {'ok': False, 'err': str(e)})[0]

        contenu = json.loads(message['contenu'])
        cuuid = contenu['cuuid']

        exchanges = [Constantes.SECURITE_PRIVE]
        routing_keys = [
            f'evenement.GrosFichiers.{cuuid}.majContenuCollection'
        ]
        reponse = await self.unsubscribe(sid, message, routing_keys, exchanges)
        reponse_signee, correlation_id = self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, reponse)

        return reponse_signee

    async def ecouter_transcodage_video(self, sid: str, message: dict):
        async with self._sio.session(sid) as session:
            try:
                enveloppe = await self.authentifier_message(session, message)
            except ErreurAuthentificationMessage as e:
                return self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, {'ok': False, 'err': str(e)})[0]

        user_id = enveloppe.get_user_id

        exchanges = [Constantes.SECURITE_PRIVE]
        routing_keys = [
            f'evenement.media.{user_id}.transcodageProgres',
            f'evenement.GrosFichiers.{user_id}.jobAjoutee',
            f'evenement.GrosFichiers.{user_id}.jobSupprimee',
        ]
        reponse = await self.subscribe(sid, message, routing_keys, exchanges, enveloppe=enveloppe)
        reponse_signee, correlation_id = self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, reponse)

        return reponse_signee

    async def retirer_transcodage_video(self, sid: str, message: dict):
        async with self._sio.session(sid) as session:
            try:
                enveloppe = await self.authentifier_message(session, message)
            except ErreurAuthentificationMessage as e:
                return self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, {'ok': False, 'err': str(e)})[0]

        user_id = enveloppe.get_user_id

        exchanges = [Constantes.SECURITE_PRIVE]
        routing_keys = [
            f'evenement.media.{user_id}.transcodageProgres',
            f'evenement.GrosFichiers.{user_id}.jobAjoutee',
            f'evenement.GrosFichiers.{user_id}.jobSupprimee',
        ]
        reponse = await self.unsubscribe(sid, message, routing_keys, exchanges)
        reponse_signee, correlation_id = self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, reponse)

        return reponse_signee
