# Docker Fundamentals — Hello World

A tiny Express app used to practice basic Docker commands: build, run, logs, exec, and multi-stage builds.

## Files

- `server.js` — the app. Responds with "Hello World" on `/`.
- `package.json` — lists the one dependency (`express`).
- `Dockerfile` — single-stage build (simple, bigger image).
- `Dockerfile.multistage` — multi-stage build (smaller, production-style image).

## Steps

1. **Build the image**
   ```bash
   docker build -t hello-node:singlestage -f Dockerfile .
   ```
   Packages the app and its dependencies into an image.

2. **Run a container**
   ```bash
   docker run -d --name hello-node-demo -p 3000:3000 -e PORT=3000 hello-node:singlestage
   ```
   Starts the app in the background and maps container port 3000 to your machine's port 3000.

3. **Test it**
   ```bash
   curl http://localhost:3000/
   ```
   Confirms the app is actually reachable and responding.

4. **Check logs**
   ```bash
   docker logs hello-node-demo
   ```
   Shows what the app has printed (startup message, each request).

5. **Look inside the container**
   ```bash
   docker exec -it hello-node-demo sh
   ```
   Opens a shell inside the running container so you can poke around.

6. **Build the multi-stage version**
   ```bash
   docker build -t hello-node:multistage -f Dockerfile.multistage .
   ```
   Builds the same app using a smaller final image (no build tools left inside).

7. **Compare image sizes**
   ```bash
   docker images hello-node
   ```
   Shows how much smaller the multi-stage image is.

8. **Clean up**
   ```bash
   docker stop hello-node-demo
   docker rm hello-node-demo
   docker rmi hello-node:singlestage hello-node:multistage
   ```
   Stops and removes the container, then deletes both images.
