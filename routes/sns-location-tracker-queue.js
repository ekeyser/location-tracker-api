var express = require("express");
var router = new express.Router();
var AWS = require("aws-sdk");
var common = require("../common");
var config = common.config();
AWS.config.loadFromPath(config.aws_config_path);
var sqs = new AWS.SQS();
var queueurl = config.url_sqs_locations;
var util = require("util");
var arrMessages = [];
var objMessages = {};
var maxMessagesForRequesting = 10;
var maxMessagesForProcessing = 100;
var s3 = new AWS.S3();
var md5 = require("md5");

var cleanupMessage = function (receipthandle) {
    "use strict";

    console.warn(receipthandle);
    sqs.deleteMessage({
        QueueUrl: queueurl,
        "ReceiptHandle": receipthandle
    }, function (err, data) {
        if (err) {
            console.warn(err, err.stack);
        } else {
            console.log(data);
        }
    });
};

var dumpInLake = function (objMessages) {
    "use strict";

    // console.warn("mk0");
    // console.log(util.inspect(objMessages, {showHidden: true, depth: null}));
    var arrS3Content = [];
    Object.keys(objMessages).forEach(function (messageId) {
        // console.warn("mk1");
        // console.log(objMessages[messageId]);
        arrS3Content.push(JSON.parse(objMessages[messageId].Body));
    });

    var hashKey = md5(Date.now());
    var params = {
        Bucket: config.s3_datalake_bucket,
        Key: hashKey,
        ContentType: "application/json",
        Body: JSON.stringify(arrS3Content)
    };

    // console.log(util.inspect(params, {showHidden: true, depth: null}));

    s3.putObject(params, function (err, data) {
        if (err) {
            console.warn(err, err.stack);
        } else {
            console.log(data);
            // loop over messages to cleanup
            Object.keys(objMessages).forEach(function (messageId) {
                cleanupMessage(objMessages[messageId].ReceiptHandle);
            });
        }
    });
};

var processMessages = function () {
    "use strict";

    /*
     a bunch of messages (which may be dupes)
     to a dictionary of single instance messages
     */
    if (arrMessages.length > 0) {
        arrMessages.forEach(function (message) {
            objMessages[message.MessageId] = message;
        });
        arrMessages = [];

        // var tools = require("../tools.js");
        // Object.keys(objMessages).forEach(function (messageId) {
        //     tools.newTopic(objMessages[messageId], AWS);
        // });
        dumpInLake(objMessages);
    }
};

var retrieve = function () {
    "use strict";

    sqs.receiveMessage({
        QueueUrl: queueurl,
        "MaxNumberOfMessages": maxMessagesForRequesting
    }, function (err, data) {
        if (err) {
            console.log(err, err.stack);
        }
        else {
            // console.log(util.inspect(data, {showHidden: true, depth: null}));
            if (data.Messages !== undefined) {
                data.Messages.forEach(function (message) {
                    arrMessages.push(message);
                });
                /*
                 can we get more?
                 */
                if (arrMessages.length < maxMessagesForProcessing) {

                    sqs.getQueueAttributes({
                        QueueUrl: queueurl,
                        AttributeNames: ["ApproximateNumberOfMessages"]
                    }, function (err, data) {
                        if (err) {
                            console.log(err, err.stack);
                        } else {
                            if (data.Attributes.ApproximateNumberOfMessages > 0) {
                                retrieve();
                            } else {
                                processMessages();
                            }
                        }
                    });
                } else {
                    processMessages();
                }
            } else {
                // console.log("mk1");
                processMessages();
            }
        }
    });
};


router.post("/", function (req, res, next) {
    "use strict";

    console.log(req.headers);
    console.log(req.body);
    if (req.headers["x-amz-sns-message-type"] === "SubscriptionConfirmation") {
        var tools = require("../tools.js");
        tools.confirmSNSSubscription(req, AWS);
    } else {
        retrieve();
    }

    res.setHeader("content-type", "application/json");
    res.send(JSON.stringify({response: "OK"}));
});

module.exports = router;
