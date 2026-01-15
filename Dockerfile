# 1️⃣ Base image
FROM node:24.13.0-alpine

# 2️⃣ Set working directory
WORKDIR /app

# 3️⃣ Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# 4️⃣ Copy source code
COPY . .

# 5️⃣ Build args for version/PR
ARG APP_VERSION=v0.0.0
ARG PR_NUMBER=
ENV APP_VERSION=${APP_VERSION}
ENV PR_NUMBER=${PR_NUMBER}

# 6️⃣ Expose port
EXPOSE 3000

# 7️⃣ Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --spider --quiet http://localhost:3000/ || exit 1

# 8️⃣ Start command
CMD ["node", "server.js"]
