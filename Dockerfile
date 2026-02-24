FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx nx build browser-ci-pipeline

FROM node:20-slim

WORKDIR /app

COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/apps/browser-ci-pipeline/dist ./apps/browser-ci-pipeline/dist
COPY --from=builder /app/server.js ./

EXPOSE 8080

CMD ["node", "server.js"]
