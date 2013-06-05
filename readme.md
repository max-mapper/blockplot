# blockplot

voxel hosting service. work in progress

## run it

blockplot has two parts: the backend (in `hoodie-server`) and the web app

for easy dev you can just use the hosted backend, which has full CORS support. in `common.js` look for `var hoodie  = new Hoodie` and make sure its using the `blockplot.com` url.

you can also run your own hoodie locally:

### installing and running a local hoodie

hoodie requires couchdb and some other stuff, you'll need to follow their [installation instructions](http://hood.ie/#installation)

then:

```sh
cd hoodie-server
npm install
npm start
```

### running the web app locally in dev mode

then to run the dev web app, go back into this folder and do:

```sh
npm install
npm start
```

every time you refresh you'll get a fresh version of all the source code, so you can edit away!