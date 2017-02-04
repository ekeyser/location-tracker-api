var express = require("express");
var router = new express.Router();
var AWS = require("aws-sdk");
var common = require("../common");
var config = common.config();
AWS.config.loadFromPath(config.aws_config_path);
var sqs = new AWS.SQS();
var queueurl = config.notify_topic;
var util = require("util");
var arrMessages = [];
var assocMessages = {};
var maxMessagesForRequesting = 10;
var maxMessagesForProcessing = 100;

var processMessages = function () {
    "use strict";

    /*
     a bunch of messages (which may be dupes)
     to a dictionary of single instance messages
     */
    arrMessages.forEach(function (message) {

        // for (var i = 0; i < arrMessages.length; i++) {
        assocMessages[message.MessageId] = message;
        // }
    });
    arrMessages = [];

    var tools = require("../tools.js");
    Object.keys(assocMessages).forEach(function (messageId) {

        // for (var messageId in assocMessages) {
        // console.log(messageId);
        // console.log(assocMessages[messageId]);
        tools.newTopic(assocMessages[messageId], AWS);
        // }
    });
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
            // console.log(data);
            if (data.Messages !== undefined) {
                data.Messages.forEach(function (message) {
                    // for (var z = 0; z < data.Messages.length; z++) {
                    arrMessages.push(message);
                    // }
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
