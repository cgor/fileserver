FROM node:8
WORKDIR /fileserver
COPY package.json /fileserver
RUN npm install
COPY . /fileserver
CMD node fileserver_v9.js
EXPOSE 8080
