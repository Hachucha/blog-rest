const jwt = require('jsonwebtoken');
const config = require('./config');

module.exports = {
    checkToken: (req, res, next) => {
        let token = req.headers.authorization.split(" ");
        if (token.length === 2 && token[0] === "Bearer") {
            token = token[1];
            if (!token) {
                res.status(401).send('No token provided.');
            }

            jwt.verify(token, config.secret, (err, decoded) => {
                if (err) {
                    res.status(401).send('Invalid token.');
                }

                req.userId = decoded.id;
                next();
            });
        }
    }
};