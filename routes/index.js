var express = require("express");
var router = new express.Router();
var AWS = require("aws-sdk");
var common = require("../common");
var config = common.config();
var util = require("util");
AWS.config.loadFromPath(config.aws_config_path);
var sqs = new AWS.SQS();
var oPayload;

var handleMessage = function () {
    "use strict";

    var params = {
        QueueUrl: config.sqs_url,
        MessageBody: JSON.stringify(oPayload)
    };
    console.log(util.inspect(params, {showHidden: true, depth: null}));

    sqs.sendMessage(params, function (err, data) {
        if (err) {
            console.warn(err, err.stack);
        }
    });
};

router.post("/", function (req, res, next) {
    "use strict";

    oPayload = req.body;
    handleMessage();

    res.setHeader("content-type", "application/json");
    res.send(JSON.stringify({response: "OK"}));
});

module.exports = router;
