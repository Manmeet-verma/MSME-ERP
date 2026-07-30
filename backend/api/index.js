const app = require("./bundle.cjs");
module.exports = app && app.default ? app.default : app;
