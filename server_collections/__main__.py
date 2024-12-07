import asyncio
import logging
from asyncio import TaskGroup
from concurrent.futures.thread import ThreadPoolExecutor

from typing import Awaitable

from millegrilles_messages.bus.BusContext import ForceTerminateExecution, StopListener
from millegrilles_messages.bus.PikaConnector import MilleGrillesPikaConnector
from millegrilles_web.MgbusHandler import MgbusHandler
from millegrilles_web.SocketIoSubscriptions import SocketIoSubscriptions
from server_collections.CollectionsContext import CollectionsContext
from server_collections.CollectionsManager import CollectionsManager
from server_collections.Configuration import CollectionsConfiguration
from server_collections.SocketIoCollectionsHandler import SocketIoCollectionsHandler
from server_collections.WebServerCollections import WebServerCollections

LOGGER = logging.getLogger(__name__)


async def force_terminate_task_group():
    """Used to force termination of a task group."""
    raise ForceTerminateExecution()


async def main():
    config = CollectionsConfiguration.load()
    context = CollectionsContext(config)

    LOGGER.setLevel(logging.INFO)
    LOGGER.info("Starting")

    # Wire classes together, gets awaitables to run
    coros = await wiring(context)

    try:
        # Use taskgroup to run all threads
        async with TaskGroup() as group:
            for coro in coros:
                group.create_task(coro)

            # Create a listener that fires a task to cancel all other tasks
            async def stop_group():
                group.create_task(force_terminate_task_group())
            stop_listener = StopListener(stop_group)
            context.register_stop_listener(stop_listener)

    except* (ForceTerminateExecution, asyncio.CancelledError):
        pass  # Result of the termination task


async def wiring(context: CollectionsContext) -> list[Awaitable]:
    # Some threads get used to handle sync events for the duration of the execution. Ensure there are enough.
    loop = asyncio.get_event_loop()
    loop.set_default_executor(ThreadPoolExecutor(max_workers=10))

    # Service instances
    bus_connector = MilleGrillesPikaConnector(context)

    # Facade
    manager = CollectionsManager(context)

    # Access modules
    socketio_subscriptions_handler = SocketIoSubscriptions(manager)
    socketio_handler = SocketIoCollectionsHandler(manager, socketio_subscriptions_handler)
    web_server = WebServerCollections(manager)
    bus_handler = MgbusHandler(manager, socketio_subscriptions_handler.handle_subscription_message)

    # Setup, injecting additional dependencies
    context.bus_connector = bus_connector
    await manager.setup(
        socketio_subscriptions_handler.evict_user,
        bus_handler.get_subscription_queue,
    )
    await web_server.setup()
    await socketio_handler.setup(web_server.web_app)

    # Create tasks
    coros = [
        context.run(),
        web_server.run(),
        bus_handler.run(),
        manager.run(),
        socketio_handler.run(),
        socketio_subscriptions_handler.run(),
    ]

    return coros


if __name__ == '__main__':
    asyncio.run(main())
    LOGGER.info("Stopped")


# import argparse
# import asyncio
# import logging
# import signal
#
# from millegrilles_web.WebAppMain import WebAppMain
#
# from millegrilles_web.WebAppMain import LOGGING_NAMES as LOGGING_NAMES_WEB, adjust_logging
# from server_collections.WebServerCollections import WebServerCollections
# from server_collections.Commandes import CommandCollectionsHandler
#
# logger = logging.getLogger(__name__)
#
# LOGGING_NAMES = ['server_collections']
# LOGGING_NAMES.extend(LOGGING_NAMES_WEB)
#
#
# class CollectionsAppMain(WebAppMain):
#
#     def __init__(self):
#         self.__logger = logging.getLogger(__name__ + '.' + self.__class__.__name__)
#         super().__init__()
#
#     def init_command_handler(self) -> CommandCollectionsHandler:
#         return CommandCollectionsHandler(self)
#
#     async def configurer(self):
#         await super().configurer()
#
#     async def configurer_web_server(self):
#         self._web_server = WebServerCollections(self.etat, self._commandes_handler)
#         await self._web_server.setup(stop_event=self._stop_event)
#
#     def exit_gracefully(self, signum=None, frame=None):
#         self.__logger.info("Fermer application, signal: %d" % signum)
#         self._stop_event.set()
#
#     def parse(self) -> argparse.Namespace:
#         args = super().parse()
#         adjust_logging(LOGGING_NAMES_WEB, args)
#         return args
#
#     @property
#     def nb_reply_correlation_max(self):
#         return 50
#
#
# async def demarrer():
#     main_inst = CollectionsAppMain()
#
#     signal.signal(signal.SIGINT, main_inst.exit_gracefully)
#     signal.signal(signal.SIGTERM, main_inst.exit_gracefully)
#
#     await main_inst.configurer()
#     logger.info("Run main collections")
#     await main_inst.run()
#     logger.info("Fin main collections")
#
#
# def main():
#     """
#     Methode d'execution de l'application
#     :return:
#     """
#     logging.basicConfig()
#     for log in LOGGING_NAMES:
#         logging.getLogger(log).setLevel(logging.INFO)
#     asyncio.run(demarrer())
#
#
# if __name__ == '__main__':
#     main()
