# Single-stage build - simple, but ships the full Node.js build toolchain
FROM node:20

WORKDIR /app

# 1. Create custom group and user

RUN groupadd -r developers && useradd -g developers armanDev

# 2. Copy dependencies and install
COPY package.json .
RUN npm install --omit=dev

# 3. Copy application code
COPY server.js .

# 4. Set ownership of /app to tom
RUN chown -R armanDev:developers /app

# 5. Switch to unprivileged user
USER armanDev

EXPOSE 3000
CMD ["node", "server.js"]
