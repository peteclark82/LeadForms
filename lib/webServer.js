var path = require("path"), async = require("async");
var express = require("express"), expressLayouts = require("express-ejs-layouts"),
    session = require("express-session"), cookieParser = require("cookie-parser"),
    bodyParser = require('body-parser');
var passport = require("passport"), LocalStrategy = require("passport-local").Strategy;
var mongoose = require("mongoose");
var nodemailer = require('nodemailer'), smtpTransport = require('nodemailer-smtp-transport');

var config = require("./config.js"), consts = require("./consts.js");

var transporterOptions = {
  host: 'smtp.moneytreewm.co.uk',
  port: 25,
  auth: {
      user: 'leadform@moneytreewm.co.uk',
      pass: 'Password01'
  }
};
var transporter = nodemailer.createTransport(smtpTransport(transporterOptions));

var Schemas = {}, Models = {};
var app = express();

setupServer();
setupData();
setupAuthentication();
setupAssetRoutes();
setupAppRoutes();

app.listen(config.webServer.port);


/* Private Methods */
function setupServer() {
  app.set("view engine", "ejs");
  app.set("views", config.webServer.templates.path);
  app.set("layout", "blank");
  app.use(expressLayouts);
  app.use(cookieParser());
  app.use(bodyParser());
  app.use(session({ secret: config.webServer.sessionSecret }));


  app.use(passport.initialize());
  app.use(passport.session());
}
function setupData() {
  mongoose.connect(config.database.uri);
  Schemas.UserDetail = new mongoose.Schema({
    username: String,
    password: String
  }, {
    collection: "userInfo"
  });
  Schemas.LeadInfo = new mongoose.Schema({
    status : { type : Number, default : 0 },
    name : String,
    email : String,
    phoneNumber : String,
    assignedTo : { type : String, default : null },
    createdDate : { type : Date, default : Date.now }
  }, {
    collection: "leadInfo"
  });
  Models.UserDetail = mongoose.model("userInfo", Schemas.UserDetail);
  Models.LeadInfo = mongoose.model("leadInfo", Schemas.LeadInfo);
}
function setupAuthentication() {
  passport.serializeUser(function(user, done) { done(null, user); });
  passport.deserializeUser(function(user, done) { done(null, user); });

  passport.use(new LocalStrategy(function(username, password, done) {
    process.nextTick(function() {
      Models.UserDetail.findOne({ username : username }, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false); }

        if (user.password !== password) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      });
    });
  }));
}
function setupAssetRoutes() {
  app.use("/assets", express.static(config.webServer.assets.path));
  app.use("/assets/jquery", express.static(path.join(config.bowerPath, "jquery/dist")));
  app.use("/assets/semanticui", express.static(path.join(config.bowerPath, "semantic/build/packaged")));
  app.use("/assets/angular", express.static(path.join(config.bowerPath, "angular")));
  app.use("/assets/angular-route", express.static(path.join(config.bowerPath, "angular-route")));
  app.use("/assets/angular-ui-router", express.static(path.join(config.bowerPath, "angular-ui-router/release")));
}
function setupAppRoutes() {
  //admin
  app.get("/", GETAdminHomeController);
  app.get("/login", GETLoginController);
  app.get("/logout", GETLogOutController);
  app.get("/viewLeads", checkAuth, GETViewLeadsController);
  app.post("/login", POSTLoginController);

  //front-end
  app.get("/getleads", GETGetLeadsController);
  app.post("/newlead", POSTNewLeadController);
  app.post("/updateleads", POSTUpdateLeadsController);
}

/* Admin Controllers */
function GETAdminHomeController(req, res) {
  res.render("adminHome", { layout : "blank",
    title : "Admin Home", loggedIn : true,
  });
}
function GETLoginController(req, res) {
  return renderLogin(req, res, { error : "", redirect : req.query.redirect });
}
function GETLogOutController(req, res) {
  req.logOut();
  res.redirect("/login");
}
function GETViewLeadsController(res, res) {
  res.render("viewLeads", { layout : "master",
    title : "View Leads", loggedIn : true,
    leadInfoStates : consts.LeadInfoState
  });
}

function POSTLoginController(req, res, next) {
  var redirectUrl = req.body.redirect;
  passport.authenticate("local", function(err, user, info) {
    if (err) { return next(err); }
    if (!user) {
      return renderLogin(req, res, { error : "Username or password not found.", redirect : redirectUrl });
    } else {
      req.logIn(user, function(err) {
        if (err) { return next(err); }
        return res.redirect(redirectUrl !== "" ? redirectUrl : "/");
      });
    }
  })(req, res, next);
}

function checkAuth(req, res, next) {
  if (req.isAuthenticated()) { next(); return; }
  var url = "/login?redirect="+ escape(req.url);
  res.redirect(url);
}

/* Admin View Renderers */
function renderLogin(req, res, options) {
  res.render("login", { layout : "master",
    title : "Login Page", loggedIn : false,
    error : options.error,
    redirect : options.redirect || ""
  });
}

/* Front-End Controllers */
function GETGetLeadsController(req, res, next) {
  var pageSize = req.query.pagesize, page = req.query.page;

  Models.LeadInfo.where({}).sort("-createdDate").skip(pageSize * (page - 1)).limit(pageSize).exec(function(err, leads) {
    if (err) {return next(err);}

    Models.LeadInfo.where({}).count().exec(function(err, leadCount) {
      var pageCount = Math.ceil(leadCount / pageSize);
      if (err) {return next(err);}

      res.json({
        leads : leads,
        pageCount : pageCount
      });
    });
  });
}

function POSTNewLeadController(req, res, next) {
  var leadInfo = new Models.LeadInfo({
    name : req.body.name,
    email : req.body.email,
    phoneNumber : req.body.phoneNumber
  });
  leadInfo.save(function(err) {
    if (err) {next(err); return;}
    res.render("frontend/thanks");

    var mailOptions = {
      from: "Lead Form ✔ <leadform@moneytreewm.co.uk>",
      to: "peteclark82@googlemail.com",
      subject: 'New Lead! ✔',
      text: 'There is a new lead! ✔', // plaintext body
      html: '<b>There is a new lead! ✔</b>' // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            console.log(error);
        }else{
            console.log('Message sent: ' + info.response);
        }
    });
  });
}
function POSTUpdateLeadsController(req, res, next) {
  var leads = req.body;
  async.forEach(leads, function(leadRaw) {
    var lead = new Models.LeadInfo(leadRaw);
    lead.remove();
    lead.save(function(err) {
      if (err) {next(err); return;}
      res.end();
    });
  });
}
