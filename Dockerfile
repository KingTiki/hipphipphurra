FROM node:24-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c
LABEL org.opencontainers.image.title="Hipphipphurra" \
      org.opencontainers.image.description="Internal employee birthday calendar with Teams reminders" \
      org.opencontainers.image.licenses="MIT AND OFL-1.1"
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATA_DIR=/data
WORKDIR /app
COPY package.json ./
COPY LICENSE THIRD_PARTY_NOTICES.md ./
RUN mkdir /data && chown node:node /data
COPY --chown=node:node src ./src
COPY --chown=node:node public ./public
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
