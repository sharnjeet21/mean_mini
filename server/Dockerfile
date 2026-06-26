FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Create logs directory
RUN mkdir -p logs

ENV NODE_ENV=production PORT=5000

EXPOSE 5000

CMD ["node", "server.js"]