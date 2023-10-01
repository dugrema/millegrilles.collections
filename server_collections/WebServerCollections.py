import logging

from millegrilles_web.WebServer import WebServer

from server_collections import Constantes as ConstantesCollections
from server_collections.SocketIoCollectionsHandler import SocketIoCollectionsHandler


class WebServerCollections(WebServer):

    def __init__(self, etat, commandes):
        self.__logger = logging.getLogger(__name__ + '.' + self.__class__.__name__)
        super().__init__(ConstantesCollections.WEBAPP_PATH, etat, commandes)

    def get_nom_app(self) -> str:
        return ConstantesCollections.APP_NAME

    async def setup_socketio(self):
        """ Wiring socket.io """
        # Utiliser la bonne instance de SocketIoHandler dans une sous-classe
        self._socket_io_handler = SocketIoCollectionsHandler(self, self._stop_event)
        await self._socket_io_handler.setup()

    async def _preparer_routes(self):
        self.__logger.info("Preparer routes WebServerCollections sous /collections")
        await super()._preparer_routes()
