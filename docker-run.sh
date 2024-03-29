#!/bin/bash

source image_info.txt
ARCH=`uname -m`

# Override version (e.g. pour utiliser x86_64_...)
# VERSION=x86_64_1.29.3
IMAGE_DOCKER=$REPO/${NAME}:${ARCH}_${VERSION}

echo Image docker : $IMAGE_DOCKER

# MQ
export HOST=mg-dev5.maple.maceroc.com
export HOST_MQ=mg-dev5

CERT_FOLDER=/var/opt/millegrilles/secrets
export MG_MQ_CAFILE=/certs/pki.millegrille.cert
export MG_MQ_CERTFILE=/certs/pki.collections.cert
export MG_MQ_KEYFILE=/certs/pki.collections.cke
export MG_MQ_URL=amqps://$HOST_MQ:5673
export MG_REDIS_HOST=mg-dev5
export PORT=3037

export DEBUG=millegrilles:common:server4,millegrilles:maitrecomptes:authentification
# export DEBUG=millegrilles:*

docker run --rm -it \
  --network host \
  -v /var/opt/millegrilles/secrets:/certs \
  -e MG_MQ_CAFILE -e MG_MQ_CERTFILE -e MG_MQ_KEYFILE \
  -e MG_MQ_URL -e HOST -e PORT \
  -e MG_REDIS_HOST \
  -e DEBUG \
  $IMAGE_DOCKER
