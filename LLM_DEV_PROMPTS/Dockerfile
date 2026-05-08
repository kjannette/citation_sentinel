# node 22-alpine, 2026-02-22
FROM node@sha256:e4bf2a82ad0a4037d28035ae71529873c069b13eb0455466ae0bc13363826e34

RUN apk add --no-cache make

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .

RUN make check
