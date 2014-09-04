var path = require("path");


module.exports = {
  webServer : {
    port : 9001,
    sessionSecret : "keyboard cat",
    assets : {
      path : path.join(__dirname, "./webServer/assets")
    },
    templates : {
      path : path.join(__dirname, "./webServer/views")
    }
  },
  database : {
    uri : "mongodb://localhost/LeadForms"
  },
  bowerPath : path.join(__dirname, "../bower_components")
};
