FROM node:10.13-alpine
ENV NODE_ENV production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json", "tsconfig.json", "./"]
RUN npm ci --prduction --silent && mv node_modules ../
COPY lib ./lib
COPY data ./data
ENV DEBUG=fts
ENV PATH="/usr/src/node_modules/.bin:${PATH}"
CMD npm run start