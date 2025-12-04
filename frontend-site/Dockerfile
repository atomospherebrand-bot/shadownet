FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=development

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY src ./src
COPY public ./public 2>/dev/null || true

EXPOSE 3050
CMD ["npm", "run", "dev", "--", "--host", "--port", "3050"]
