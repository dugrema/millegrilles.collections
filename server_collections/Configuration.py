import argparse
import logging

from millegrilles_web.Configuration import WebAppConfiguration

LOGGING_NAMES = [__name__, 'millegrilles_messages', 'millegrilles_web', 'server_collections']


def __adjust_logging(args: argparse.Namespace):
    logging_format = '%(levelname)s:%(name)s:%(message)s'

    if args.logtime:
        logging_format = f'%(asctime)s - {logging_format}'

    logging.basicConfig(format=logging_format)

    if args.verbose is True:
        for log in LOGGING_NAMES:
            logging.getLogger(log).setLevel(logging.DEBUG)
    else:
        for log in LOGGING_NAMES:
            logging.getLogger(log).setLevel(logging.INFO)


def _parse_command_line():
    parser = argparse.ArgumentParser(description="Collections for MilleGrilles")
    parser.add_argument(
        '--verbose', action="store_true", required=False,
        help="More logging"
    )
    parser.add_argument(
        '--logtime', action="store_true", required=False,
        help="Add time to logging"
    )

    args = parser.parse_args()
    __adjust_logging(args)
    return args


class CollectionsConfiguration(WebAppConfiguration):

    def __init__(self):
        super().__init__()

    @staticmethod
    def load():
        # Override
        config = CollectionsConfiguration()
        _parse_command_line()
        config.parse_config()
        return config
