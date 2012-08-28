var vows = require("vows"),
    assert = require("assert"),
    cube = require("../"),
    test = require("./test");

var suite = vows.describe("visualizer");

var port = ++test.port, server = cube.server({
  "mongo-host": "localhost",
  "mongo-port": 27017,
  "mongo-database": "cube_test",
  "http-port": port,
  "authenticator": "allow_all"
});

server.register = function(db, endpoints) {
  cube.evaluator.register(db, endpoints);
  cube.visualizer.register(db, endpoints);
};

server.start();

suite.export(module);