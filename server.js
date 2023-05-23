const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
// const bcrypt = require('bcrypt');
const crypto = require('crypto');
const multer = require('multer');
const config = require('./config');
const User = require('./models/user');
const Session = require('./models/session');
const Post = require('./models/post');
const middleware = require('./middleware');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('uploads/'));

mongoose.connect(config.mongoAddres);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    const user = new User({ email, password });

    try {
        await user.save();
        res.status(200).send('Welcome to the club!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error registering new user');
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            res.status(401).send('Invalid email or password');
        } else {
            console.log(51);
            user.comparePassword(password, async (err, isMatch) => {
                if (isMatch && !err) {
                    const token = jwt.sign({ id: user._id }, config.secret, { expiresIn: config.jwtExpireTime });
                    const refreshToken = crypto.randomBytes(64).toString('hex');
                    const session = new Session({
                        user: user._id,
                        refreshToken
                    });
                    console.log(61);
                    session.save();
                    console.log(61);
                    res.status(200).json({ token, refreshToken });
                } else {
                    res.status(401).send('Invalid email or password');
                }
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Error on the server.');
    }
});


app.post('/api/logout', async (req, res) => {
    const refreshToken = req.headers['x-refresh-token'];
    try {
        await Session.findOneAndDelete({ refreshToken });
        res.status(200).send('Logout successful');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error on the server.');
    }
});

app.post('/api/token/refresh', async (req, res) => {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) return res.status(401).send('Refresh token not provided');
    try {
        const session = await Session.findOne({ refreshToken }).populate('user');
        if (!session || !session.user) {
            return res.status(401).send('Invalid refresh token');
        }
        const token = jwt.sign({ id: session.user._id }, config.secret, { expiresIn: config.jwtExpireTime });
        res.status(200).json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error on the server.');
    }
});

app.post('/api/posts', middleware.checkToken, upload.array('media'), async (req, res) => {
    try {
        const text = req.body.text;
        let media = [];
        if (req.files) {
            media = req.files.map((f) => f.filename);
        }

        author = req.userId;

        const post = new Post({ author, text, media });
        await post.save();
        res.status(200).send('Post created successfully.');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error creating post.');
    }
});

app.get('/api/posts', async (req, res) => {
    try {
        const skip = req.query.page ? (req.query.page - 1) * 20 : 0;
        const posts = await Post.find().sort('-created').skip(skip).limit(20);
        res.status(200).json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error getting posts.');
    }
});

app.put('/api/posts/:id', middleware.checkToken, async (req, res) => {
    try {
        const { text, media } = req.body;
        const post = await Post.findById(req.params.id);
        if (req.userId !== post.author.toString()) {
            res.status(401).send('Not authorized to edit this post.');
        } else {
            post.text = text;
            post.media = media;
            await post.save();
            res.status(200).send('Post updated successfully');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating post.');
    }
});

app.delete('/api/posts/:id', middleware.checkToken, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        console.log(post);
        if (req.userId !== post.author.toString()) {
            res.status(401).send('Not authorized to delete this post.');
        } else {
            await Post.deleteOne({_id: post._id});
            res.status(200).send('Post deleted successfully.');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting post.');
    }
});

app.listen(3000, () => {
    console.log('Server started on port 3000');
});