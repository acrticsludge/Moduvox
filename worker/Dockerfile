FROM node:20-slim

# Install LibreOffice Impress (PPTX -> PDF converter)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libreoffice-impress && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 8080

CMD ["node", "server.js"]
