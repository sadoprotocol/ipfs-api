# ipfs-api

<br />
<br />

## Deployment

### Requirement

- IPFS server (access to port `5001`)
- MongoDB
- NodeJS

<br />

### Configuration

Copy `dotenv` to `.env`.\
Edit `.env` and set proper parameters.

<br />

Install packages:

```javascript
$ npm install
```

<br />

Start:

```javascript
$ npm start
```

<br />
<br />

## Usage

Examples of html form and upload javascript procedure are available in [examples](https://github.com/cakespecial/ipfs-api/tree/main/examples).

> Note: Use the `pin` flag for persistent. Otherwise the media will get removed by garbage collector.

<br />
<br />

## Pending items

- If IPNS is used, create key backup procedures
- API Authentication
- List uploaded? (Require authentication)

