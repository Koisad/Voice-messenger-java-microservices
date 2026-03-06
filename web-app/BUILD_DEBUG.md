# Debugging Build Error

If you see an error like `"/nginx.conf": not found`, it usually means the file is not in the Docker build context on your server.

1. **Verify Files on Server**:
   Ensure `nginx.conf` exists in the `web-app` directory on your server.
   ```bash
   ls -l web-app/nginx.conf
   ```

2. **Check Build Context**:
   If you are running `docker-compose build web-app`, Compose uses `context: ./web-app`. This expects `nginx.conf` to be inside `web-app`.

3. **Force Rebuild**:
   Sometimes caches get stuck.
   ```bash
   docker-compose build --no-cache web-app
   ```

4. **Manual Build Test**:
   Try building manually from the `web-app` directory to isolate the issue:
   ```bash
   cd web-app
   docker build -t test-web .
   ```
