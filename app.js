var express = require("express");
var path = require("path");
var favicon = require("serve-favicon");
var logger = require("morgan");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");

var util = require("./util");
var index = require("./routes/index");
var version = require("./routes/version");
var sns_location_tracker_queue = require("./routes/sns-location-tracker-queue");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, "public", "favicon.ico")));
app.use(logger("dev"));
app.use(util.overrideContentType());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

process.env.XRAY_TRACING_DEFAULT_NAME="locationtrackerapi";
var AWSXRay = require("aws-xray-sdk");
app.use(AWSXRay.express.openSegment());

app.use("/", index);
app.use("/version", version);
app.use("/sns-location-tracker-queue", sns_location_tracker_queue);

app.use(AWSXRay.express.closeSegment());

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    "use strict";

    var err = new Error("Not Found");
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    "use strict";

    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error");
});

module.exports = app;
