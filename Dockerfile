FROM node:20-alpine

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY server.js .
COPY public ./public

EXPOSE 3000
CMD ["node", "server.js"]

#Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

