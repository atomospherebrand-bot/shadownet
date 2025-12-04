FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=development

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

EXPOSE 6070
CMD ["npm", "run", "dev"]
