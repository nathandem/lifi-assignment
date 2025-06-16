# Stage 1: build
FROM node:22 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Sstage 2: create slim runtime
FROM node:22-slim

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env ./

RUN npm install --production

EXPOSE 3000

CMD ["node", "--env-file=.env", "dist/api.js"]
