FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies, ignoring the host's package-lock.json to force linux-musl resolution
RUN rm -f package-lock.json && npm install

# Copy source code
COPY . .

# Expose Vite configured port
EXPOSE 3000

# Start Vite dev server on 0.0.0.0
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
