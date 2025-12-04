FROM node:20-alpine

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY server.js .
COPY public ./public

ARG APP_VERSION=v0.0.0
ARG PR_NUMBER=
ENV APP_VERSION=${APP_VERSION}
ENV PR_NUMBER=${PR_NUMBER}

EXPOSE 3000
CMD ["node", "server.js"]

#Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --spider --quiet http://localhost:3000/ || exit 1

