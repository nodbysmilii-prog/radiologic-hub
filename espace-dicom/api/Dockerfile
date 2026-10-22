# dicom-api : petit serveur Node de l'Espace DICOM (aucune dépendance npm pour l'instant)
FROM node:22.23.3-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY src ./src
USER node
EXPOSE 3000
CMD ["node", "src/serveur.js"]
