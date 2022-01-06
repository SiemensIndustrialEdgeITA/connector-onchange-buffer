#### Stage BASE ########################################################
FROM node:14-alpine AS BASE

# Install base packages, create data dir
RUN set -ex && \
    apk add --no-cache \
        bash \
        tzdata \
        iputils \
        linux-headers \
        udev \
        openssl

# Copy app packages
WORKDIR /usr/src/app/

# Copy app packages definition
COPY ./app/package.json ./package.json

#### Stage BUILD #######################################################
FROM BASE AS BUILD

RUN apk add --no-cache --virtual buildtools \
                        ca-certificates \
                        curl \
                        nano \
                        git \
                        openssh-client \
                        build-base

# Install app packages
RUN npm install

#### Stage RELEASE ######################################################
FROM BASE AS RELEASE

RUN export BUILD_DATE=$(date +"%Y-%m-%dT%H:%M:%SZ")

WORKDIR /usr/src/app/
# copy builded apps from BUILD
COPY --from=BUILD /usr/src/app/ ./

# copy app source code
COPY ./app/ ./
RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["/usr/src/app/entrypoint.sh"]