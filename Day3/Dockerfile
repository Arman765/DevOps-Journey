# Single-stage build - simple, but ships the full Node.js build toolchain
# and everything needed to install packages, even though none of that is
# needed at runtime.
FROM node:20

WORKDIR /app

COPY package.json .
RUN npm install --omit=dev

COPY server.js .

EXPOSE 3000
CMD ["node", "server.js"]
