var common = require("./common");
var util = require("util");

module.exports = {
    confirmSNSSubscription: function (req, AWS) {
        "use strict";

        console.log(util.inspect(req.body, {showHidden: true, depth: null}));
        var sns = new AWS.SNS();
        var params = {
            Token: req.body.Token,
            TopicArn: req.body.TopicArn,
            AuthenticateOnUnsubscribe: "false"
        };
        sns.confirmSubscription(params, function (err, data) {
            if (err) {
                console.warn(err, err.stack);
            } else {
                console.log(data);
            }
        });
    }
};