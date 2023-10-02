import asyncio
import logging

from aiohttp import web
from aiohttp.web_request import Request
from typing import Optional

from millegrilles_web.WebServer import WebServer
from millegrilles_web.TransfertFichiers import ReceptionFichiersMiddleware

from server_collections import Constantes as ConstantesCollections
from server_collections.SocketIoCollectionsHandler import SocketIoCollectionsHandler


class WebServerCollections(WebServer):

    def __init__(self, etat, commandes):
        self.__logger = logging.getLogger(__name__ + '.' + self.__class__.__name__)
        super().__init__(ConstantesCollections.WEBAPP_PATH, etat, commandes)

        self.__semaphore_web_verifier = asyncio.BoundedSemaphore(value=5)

        self.__reception_fichiers = ReceptionFichiersMiddleware(
            self.app, self.etat, '/collections/fichiers/upload')

    def get_nom_app(self) -> str:
        return ConstantesCollections.APP_NAME

    async def setup(self, configuration: Optional[dict] = None, stop_event: Optional[asyncio.Event] = None):
        await super().setup(configuration, stop_event)
        await self.__reception_fichiers.setup()

    async def setup_socketio(self):
        """ Wiring socket.io """
        # Utiliser la bonne instance de SocketIoHandler dans une sous-classe
        self._socket_io_handler = SocketIoCollectionsHandler(self, self._stop_event)
        await self._socket_io_handler.setup()

    async def _preparer_routes(self):
        self.__logger.info("Preparer routes WebServerCollections sous /collections")
        await super()._preparer_routes()

        app_path = self.app_path
        self._app.add_routes([
            # Authentification
            web.get(f'{app_path}/fichiers/verifier', self.handle_verifier_fichier),
            web.get(f'{app_path}/streams/verifier', self.handle_verifier_streams),
        ])

    async def run(self):
        """
        Override pour ajouter thread reception fichiers
        :return:
        """
        tasks = [
            super().run(),
            self.__reception_fichiers.run(self._stop_event)
        ]
        await asyncio.gather(*tasks)

    async def handle_verifier_fichier(self, request: Request):
        async with self.__semaphore_web_verifier:
            self.__logger.warning("handle_verifier_fichier NOT IMPLEMENTED")
            return web.HTTPUnauthorized()

    async def handle_verifier_streams(self, request: Request):
        async with self.__semaphore_web_verifier:
            self.__logger.warning("handle_verifier_streams NOT IMPLEMENTED")
            return web.HTTPUnauthorized()
