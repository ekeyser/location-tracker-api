exports.overrideContentType = function () {
    "use strict";

    return function (req, res, next) {
        if (req.headers["x-amz-sns-message-type"]) {
            req.headers["content-type"] = "application/json;charset=UTF-8";
        }
        next();
    };
};