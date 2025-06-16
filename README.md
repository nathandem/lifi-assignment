# System description

The repository contains:

- A scraping service, which fetches, parses and stores in a mongo database the latest `FeesCollected` events from a lifi's `FeeCollector` smart-contract instance on an EVM blockchain.

- A REST API returning the events involving one lifi's integrator.

## How to run

The execution environment influences the steps to run this application, be it the scraping service or the rest api. Locally applications can be run as node processes natively or via a docker container.

However in all cases, a mongodb instance is assumed to exist idependently, with a user having `dbAdmin` permission on it (see [this](https://www.mongodb.com/docs/manual/self-managed-deployments/) and [that](https://www.mongodb.com/docs/manual/reference/method/js-user-management/) for pointers on how to set up mongodb). A `.env` following the structure of `.env.example` is also required.

#### Local execution environment

To run the executables without compilation

```sh
$ npm install

# to run the scraping service
$ npm run scrap

# to run the api
$ npm run api
```

#### Docker (container environment)

For the rest api

```sh
# build the image and run the container
$ docker build -f Dockerfile.app -t lifi-api .
$ docker run -p 3000:3000 --add-host=host.docker.internal:host-gateway -d --name lifi-api-container lifi-api

# optionally
$ docker logs lifi-api-container --follow

# to stop the container
$ docker stop lifi-api-container
```

For the scraping service

```sh
$ docker build -f Dockerfile.service -t lifi-events-scraping-service .
$ docker run --rm lifi-events-scraping-service
```

Note: this way of packaging and running the docker containers in this repository assumes that we are in a local environment.

## How to test

```sh
$ npm run test
```

## Remarks

A lot of how the app is written and packaged depends on the specifics on the execution environment, knowing that part is a requisite to reach production grade - e.g. retry of the scraping service, resource limits/timeouts, definition of environment variables, etc.

There's an argument to be made to separate the code and packaging of the service and the API further, but at this stage it is a premature decision. On the other end, if the whole system (service and api) is to be run as an event-driven system, a single entrypoint and Dockerfile would suffice.

Besides the codebase contains a lot of comments which are notes to the reviewers about the thought process for specific aspects of the system.
