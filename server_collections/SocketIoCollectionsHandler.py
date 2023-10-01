import asyncio
import json

from typing import Optional

from millegrilles_messages.messages import Constantes
from millegrilles_web.SocketIoHandler import SocketIoHandler, ErreurAuthentificationMessage
from server_collections import Constantes as ConstantesCollections


class SocketIoCollectionsHandler(SocketIoHandler):

    def __init__(self, app, stop_event: asyncio.Event):
        super().__init__(app, stop_event)

    async def _preparer_socketio_events(self):
        await super()._preparer_socketio_events()

        # Instances
        self._sio.on('getCategoriesUsager', handler=self.requete_categories_usager)
        self._sio.on('getGroupesUsager', handler=self.requete_groupes_usager)
        self._sio.on('getDocumentsGroupe', handler=self.requete_documents_groupe)
        self._sio.on('getClesGroupes', handler=self.requete_cles_groupes)
        self._sio.on('sauvegarderCategorieUsager', handler=self.sauvegarder_categorie_usager)
        self._sio.on('sauvegarderGroupeUsager', handler=self.sauvegarder_groupe_usager)
        self._sio.on('sauvegarderDocument', handler=self.sauvegarder_document)

        # Listeners
        self._sio.on('ecouterEvenementsCategoriesUsager', handler=self.ecouter_categories_usager)
        self._sio.on('retirerEvenementsCategoriesUsager', handler=self.retirer_categories_usager)
        self._sio.on('ecouterEvenementsGroupesUsager', handler=self.ecouter_groupes_usager)
        self._sio.on('retirerEvenementsGroupesUsager', handler=self.retirer_groupes_usager)
        self._sio.on('ecouterEvenementsDocumentsUsager', handler=self.ecouter_documents_usager)
        self._sio.on('retirerEvenementsDocumentsUsager', handler=self.retirer_documents_usager)

    @property
    def exchange_default(self):
        return ConstantesCollections.EXCHANGE_DEFAUT

    async def requete_categories_usager(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           ConstantesCollections.NOM_DOMAINE, 'getCategoriesUsager')

    async def requete_groupes_usager(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           ConstantesCollections.NOM_DOMAINE, 'getGroupesUsager')

    async def requete_documents_groupe(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           ConstantesCollections.NOM_DOMAINE, 'getDocumentsGroupe')

    async def requete_cles_groupes(self, sid: str, message: dict):
        return await self.executer_requete(sid, message,
                                           ConstantesCollections.NOM_DOMAINE, 'getClesGroupes')

    async def sauvegarder_categorie_usager(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'sauvegarderCategorieUsager')

    async def sauvegarder_groupe_usager(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'sauvegarderGroupeUsager')

    async def sauvegarder_document(self, sid: str, message: dict):
        return await self.executer_commande(sid, message,
                                            ConstantesCollections.NOM_DOMAINE, 'sauvegarderDocument')

    # Listeners

    async def ecouter_categories_usager(self, sid: str, message: dict):
        async with self._sio.session(sid) as session:
            try:
                enveloppe = await self.authentifier_message(session, message)
            except ErreurAuthentificationMessage as e:
                return self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, {'ok': False, 'err': str(e)})[0]

        user_id = enveloppe.get_user_id

        exchanges = [Constantes.SECURITE_PRIVE]
        routing_keys = [
            f'evenement.Documents.{user_id}.sauvegarderCategorieUsager'
        ]
        reponse = await self.subscribe(sid, message, routing_keys, exchanges, enveloppe=enveloppe)
        reponse_signee, correlation_id = self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, reponse)

        return reponse_signee

    async def retirer_categories_usager(self, sid: str, message: dict):
        async with self._sio.session(sid) as session:
            try:
                enveloppe = await self.authentifier_message(session, message)
            except ErreurAuthentificationMessage as e:
                return self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, {'ok': False, 'err': str(e)})[0]

        user_id = enveloppe.get_user_id

        exchanges = [Constantes.SECURITE_PRIVE]
        routing_keys = [
            f'evenement.Documents.{user_id}.sauvegarderCategorieUsager'
        ]
        reponse = await self.unsubscribe(sid, message, routing_keys, exchanges)
        reponse_signee, correlation_id = self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, reponse)

        return reponse_signee

    async def ecouter_groupes_usager(self, sid: str, message: dict):
        async with self._sio.session(sid) as session:
            try:
                enveloppe = await self.authentifier_message(session, message)
            except ErreurAuthentificationMessage as e:
                return self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, {'ok': False, 'err': str(e)})[0]

        user_id = enveloppe.get_user_id

        exchanges = [Constantes.SECURITE_PRIVE]
        routing_keys = [
            f'evenement.Documents.{user_id}.sauvegarderGroupeUsager'
        ]
        reponse = await self.subscribe(sid, message, routing_keys, exchanges, enveloppe=enveloppe)
        reponse_signee, correlation_id = self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, reponse)

        return reponse_signee

    async def retirer_groupes_usager(self, sid: str, message: dict):
        async with self._sio.session(sid) as session:
            try:
                enveloppe = await self.authentifier_message(session, message)
            except ErreurAuthentificationMessage as e:
                return self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, {'ok': False, 'err': str(e)})[0]

        user_id = enveloppe.get_user_id

        exchanges = [Constantes.SECURITE_PRIVE]
        routing_keys = [
            f'evenement.Documents.{user_id}.sauvegarderGroupeUsager'
        ]
        reponse = await self.unsubscribe(sid, message, routing_keys, exchanges)
        reponse_signee, correlation_id = self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, reponse)

        return reponse_signee

    async def ecouter_documents_usager(self, sid: str, message: dict):
        async with self._sio.session(sid) as session:
            try:
                enveloppe = await self.authentifier_message(session, message)
            except ErreurAuthentificationMessage as e:
                return self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, {'ok': False, 'err': str(e)})[0]

        user_id = enveloppe.get_user_id

        exchanges = [Constantes.SECURITE_PRIVE]
        routing_keys = [
            f'evenement.Documents.{user_id}.sauvegarderDocument'
        ]
        reponse = await self.subscribe(sid, message, routing_keys, exchanges, enveloppe=enveloppe)
        reponse_signee, correlation_id = self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, reponse)

        return reponse_signee

    async def retirer_documents_usager(self, sid: str, message: dict):
        async with self._sio.session(sid) as session:
            try:
                enveloppe = await self.authentifier_message(session, message)
            except ErreurAuthentificationMessage as e:
                return self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, {'ok': False, 'err': str(e)})[0]

        user_id = enveloppe.get_user_id

        exchanges = [Constantes.SECURITE_PRIVE]
        routing_keys = [
            f'evenement.Documents.{user_id}.sauvegarderDocument'
        ]
        reponse = await self.unsubscribe(sid, message, routing_keys, exchanges)
        reponse_signee, correlation_id = self.etat.formatteur_message.signer_message(Constantes.KIND_REPONSE, reponse)

        return reponse_signee
