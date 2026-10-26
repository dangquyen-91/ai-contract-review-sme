FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim
ENV NODE_ENV=production PORT=4000
RUN apt-get update && apt-get install -y --no-install-recommends libreoffice-writer fonts-liberation fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
RUN node -e "require('tesseract.js').createWorker('vie+eng').then((w) => w.terminate())"
COPY --from=build /app/dist ./dist
COPY swagger.yaml ./
EXPOSE 4000
CMD ["node", "dist/server.js"]
