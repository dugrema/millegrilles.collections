# FROM node:18
FROM docker.maceroc.com/millegrilles_webappbase:2022.7.0

ENV APP_FOLDER=/usr/src/app \
    NODE_ENV=production \
    PORT=443 \
    MG_MQ_URL=amqps://mq:5673

EXPOSE 80 443

# Creer repertoire app, copier fichiers
# WORKDIR $APP_FOLDER

COPY . $APP_FOLDER/
RUN npm install --omit=dev

CMD [ "npm", "run", "server" ]
