FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 80
VOLUME ["/app/data"]
CMD ["npm", "start"]