import asyncio
import logging
import json

#from threading import Event
from asyncio import Event
from asyncio.exceptions import TimeoutError
from pika.exchange_type import ExchangeType

from millegrilles_messages.messages import Constantes
from millegrilles_messages.messages.MessagesThread import MessagesThread
from millegrilles_messages.messages.MessagesModule import RessourcesConsommation, ExchangeConfiguration

logger = logging.getLogger(__name__)

LOGGING_FORMAT = '%(asctime)s %(threadName)s %(levelname)s: %(message)s'


async def main():
    logger.info("Debut main()")
    stop_event = Event()

    # Preparer resources consumer
    reply_res = RessourcesConsommation(callback_reply_q)

    messages_thread = MessagesThread(stop_event)
    messages_thread.set_reply_ressources(reply_res)

    # Demarrer traitement messages
    await messages_thread.start_async()
    fut_run = messages_thread.run_async()
    fut_run_tests = run_tests(messages_thread, stop_event)

    tasks = [
        asyncio.create_task(fut_run),
        asyncio.create_task(fut_run_tests),
    ]

    # Execution de la loop avec toutes les tasks
    await asyncio.tasks.wait(tasks, return_when=asyncio.tasks.FIRST_COMPLETED)

    logger.info("Fin main()")


async def run_tests(messages_thread, stop_event):
    producer = messages_thread.get_producer()

    # Demarrer test (attendre connexion prete)
    logger.info("Attendre pret")
    await messages_thread.attendre_pret()
    logger.info("produire messages")

    requete = {'idmg': 'zeYncRqEqZ6eTEmUZ8whJFuHG796eSvCTWE4M432izXrp22bAtwGm7Jf', 'readwrite': False}
    token = await producer.executer_requete(
        requete, domaine='CoreTopologie', action='getTokenHebergement', exchange=Constantes.SECURITE_PUBLIC)

    jwt_token = token.parsed['jwt']

    logger.info("Token read-only recu : %s" % jwt_token)

    requete = {'idmg': 'zeYncRqEqZ6eTEmUZ8whJFuHG796eSvCTWE4M432izXrp22bAtwGm7Jf', 'readwrite': True}
    token = await producer.executer_requete(
        requete, domaine='CoreTopologie', action='getTokenHebergement', exchange=Constantes.SECURITE_PUBLIC)

    jwt_token = token.parsed['jwt']

    logger.info("Token read-write recu : %s" % jwt_token)

    # try:
    #     await asyncio.wait_for(stop_event.wait(), 300)
    # except TimeoutError:
    #     pass
    stop_event.set()


async def callback_reply_q(message, module_messages: MessagesThread):
    message_parsed = message.parsed

    try:
        logger.info("Token recu : %s" % json.dumps(message_parsed, indent=2))
    except KeyError:
        logger.info("Message recu : %s" % json.dumps(message_parsed, indent=2))

    # wait_event.wait(0.7)


if __name__ == '__main__':
    # logging.basicConfig()
    logging.basicConfig(format=LOGGING_FORMAT, level=logging.WARN)
    logging.getLogger(__name__).setLevel(logging.DEBUG)
    logging.getLogger('millegrilles').setLevel(logging.DEBUG)
    asyncio.run(main())
