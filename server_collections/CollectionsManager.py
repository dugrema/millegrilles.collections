from typing import Awaitable, Callable, Optional

from millegrilles_messages.bus.PikaQueue import MilleGrillesPikaQueueConsumer
from millegrilles_messages.messages.MessagesModule import MessageWrapper
from millegrilles_web.WebAppManager import WebAppManager
from server_collections.CollectionsContext import CollectionsContext


class CollectionsManager(WebAppManager):

    def __init__(self, context: CollectionsContext):
        super().__init__(context)
        self.__evict_user_callback: Optional[Callable[[str], Awaitable[None]]] = None
        self.__get_subscription_queue: Optional[Callable[[], MilleGrillesPikaQueueConsumer]] = None

    async def setup(self,
                    evict_user_callback: Callable[[str], Awaitable[None]],
                    get_subscription_queue: Callable[[], MilleGrillesPikaQueueConsumer]):
        self.__evict_user_callback = evict_user_callback
        self.__get_subscription_queue = get_subscription_queue

    @property
    def context(self) -> CollectionsContext:
        return super().context

    def get_subscription_queue(self) -> MilleGrillesPikaQueueConsumer:
        return self.__get_subscription_queue()

    async def evict_user_message(self, message: MessageWrapper):
        raise NotImplementedError()

    @property
    def app_name(self) -> str:
        return 'collections'

    @property
    def application_path(self):
        return '/collections'
