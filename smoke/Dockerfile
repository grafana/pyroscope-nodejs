ARG NODE_VERSION=lts
FROM node:${NODE_VERSION}-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /sdk

COPY package.json yarn.lock .yarnrc.yml ./
RUN corepack enable && yarn install --immutable

COPY tsconfig.json ./
COPY config/ ./config/
COPY src/ ./src/
COPY tools/ ./tools/
RUN yarn build && yarn pack --out /tmp/pyroscope-nodejs.tgz

WORKDIR /app
RUN npm init -y && npm install /tmp/pyroscope-nodejs.tgz

COPY smoke/app.mjs ./

CMD ["node", "app.mjs"]
