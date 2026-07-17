// server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const pool = new Pool({
    user: 'techsusadmin',
    host: 'localhost',
    database: 'squidgamedb',
    password: 'ChangePassword',
    port: 5432,
});

pool.connect(async (err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('Successfully connected to the PostgreSQL database!');

    // TRUNCATE the 'games' table to wipe all data on server start
    try {
        await client.query('TRUNCATE TABLE games CASCADE');
        console.log('Database table "games" has been truncated.');
    } catch (truncateErr) {
        console.error('Error truncating tables:', truncateErr);
    } finally {
        release();
    }
});

app.use(express.json());
app.use(express.static('public'));
app.use('/sounds', express.static(__dirname + '/public/sounds')); // Serve sounds directory
const games = {};
const activeTimers = {};

const createInitialGameState = (passwords) => ({
    currentPage: 'logPlayers_square',
    players: [],
    playersLeft: 0,
    timer: 0,
    rlglMode: 'manual',
    cookieShapes: {},
    cookieSelections: {},
    mingleGroups: 0,
    nextPlayerId: 1,
    passwords: {
        triangle: passwords.triangle_password,
        square: passwords.square_password,
        countdown: passwords.countdown_password,
    }
});

app.post('/api/create_game', async (req, res) => {
    try {
        const { triangle_password, square_password, countdown_password } = req.body;
        const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();

        const query = 'INSERT INTO games (game_id, triangle_password, square_password, countdown_password) VALUES ($1, $2, $3, $4) RETURNING *';
        await pool.query(query, [gameId, triangle_password, square_password, countdown_password]);

        games[gameId] = createInitialGameState({ triangle_password, square_password, countdown_password });

        io.emit('newGameCreated');

        res.status(201).json({ success: true, game: { game_id: gameId } });
    } catch (error) {
        console.error('Error creating new game:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.get('/api/games', async (req, res) => {
    try {
        const result = await pool.query('SELECT game_id FROM games');
        res.status(200).json({ success: true, games: result.rows });
    } catch (error) {
        console.error('Error fetching games:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.post('/api/join_game', async (req, res) => {
    const { gameId, password, role } = req.body;

    try {
        const game = games[gameId];
        if (!game) {
            return res.status(404).json({ success: false, message: 'Game not found in memory.' });
        }

        const gameQuery = 'SELECT * FROM games WHERE game_id = $1';
        const gameResult = await pool.query(gameQuery, [gameId]);
        const dbGame = gameResult.rows[0];

        if (!dbGame) {
            return res.status(404).json({ success: false, message: 'Game not found in database.' });
        }

        const rolePassword = dbGame[`${role}_password`];

        if (password !== rolePassword) {
            return res.status(401).json({ success: false, message: 'Incorrect password.' });
        }

        res.status(200).json({
            success: true,
            gameId,
            role,
            currentPage: game.currentPage,
            players: game.players,
            playersLeft: game.playersLeft,
            timer: game.timer,
            cookieSelections: game.cookieSelections,
            cookieShapes: game.cookieShapes,
            mingleGroups: game.mingleGroups,
        });

    } catch (error) {
        console.error('Error joining game:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.post('/api/game/:gameId/update_players', async (req, res) => {
    const { gameId } = req.params;
    const { players, playersLeft } = req.body;
    const game = games[gameId];
    if (!game) {
        return res.status(404).json({ success: false, message: 'Game not found.' });
    }

    game.players = players;
    game.playersLeft = playersLeft;

    res.status(200).json({ success: true, message: 'Player state updated successfully.' });

    io.to(gameId).emit('player_list_updated', {
        players: game.players,
        playersLeft: game.playersLeft,
    });
});

app.post('/api/game/:gameId/update_game_state', async (req, res) => {
    const { gameId } = req.params;
    const { newPage, players, playersLeft, timer, rlglMode, cookieShapes, mingleGroups } = req.body;
    const game = games[gameId];

    if (!game) {
        return res.status(404).json({ success: false, message: 'Game not found.' });
    }

    const pageChanged = game.currentPage !== newPage;

    if (pageChanged && activeTimers[gameId]) {
        clearInterval(activeTimers[gameId]);
        delete activeTimers[gameId];
    }

    game.currentPage = newPage;
    game.players = players;
    game.playersLeft = playersLeft;
    game.timer = timer;
    game.rlglMode = rlglMode;
    if(cookieShapes) {
        game.cookieShapes = cookieShapes;
    }
    if (mingleGroups) {
        game.mingleGroups = mingleGroups;
    }

    res.status(200).json({ success: true, message: 'Game state updated successfully.' });

    io.to(gameId).emit('page_changed', {
        newPage,
        players,
        playersLeft,
        timer,
        rlglMode,
        cookieShapes: game.cookieShapes,
        mingleGroups: game.mingleGroups,
    });

    const pageHasTimer = newPage.includes('rlgl_square') || newPage.includes('cookie_') || newPage.includes('mingle') || newPage.includes('lunch') || newPage.includes('glassBridge');
    if (pageHasTimer && pageChanged) {
        let currentTimer = game.timer;
        activeTimers[gameId] = setInterval(() => {
            currentTimer--;
            game.timer = currentTimer;

            io.to(gameId).emit('timerUpdate', { timer: currentTimer });

            if (currentTimer <= 0) {
                clearInterval(activeTimers[gameId]);
                delete activeTimers[gameId];

                let nextPage;
                if (game.currentPage.includes('rlgl_square')) {
                    nextPage = 'rlglPost_square';
                } else if (game.currentPage.includes('cookie_')) {
                    nextPage = 'cookiePost_square';
                } else if (game.currentPage.includes('mingle')) {
                    nextPage = 'minglePost_square';
                } else if (game.currentPage.includes('lunch')) {
                    nextPage = 'lunchPost_square';
                } else if (game.currentPage.includes('glassBridge')) {
                    nextPage = 'glassBridgePost_square';
                }
                if (nextPage) {
                    game.currentPage = nextPage;
                    io.to(gameId).emit('page_changed', {
                        newPage: nextPage,
                        players: game.players,
                        playersLeft: game.playersLeft,
                        timer: 0,
                    });
                }
            }
        }, 1000);
    }
});

app.post('/api/game/:gameId/end_game', async (req, res) => {
    const { gameId } = req.params;

    if (!games[gameId]) {
        return res.status(404).json({ success: false, message: 'Game not found in memory.' });
    }

    try {
        // Delete from in-memory object
        if (activeTimers[gameId]) {
            clearInterval(activeTimers[gameId]);
            delete activeTimers[gameId];
        }
        delete games[gameId];

        // Delete from the database
        const query = 'DELETE FROM games WHERE game_id = $1';
        await pool.query(query, [gameId]);

        // Broadcast the event to all clients in the game room
        io.to(gameId).emit('gameEnded');

        res.status(200).json({ success: true, message: 'Game ended and deleted successfully.' });

    } catch (error) {
        console.error('Error ending game:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinGameRoom', (gameId) => {
        socket.join(gameId);
        console.log(`User ${socket.id} joined game room ${gameId}`);
    });

    socket.on('updateCookieSelections', ({ gameId, cookieSelections }) => {
        const game = games[gameId];
        if (game) {
            game.cookieSelections = cookieSelections;
            io.to(gameId).emit('cookieSelectionsUpdated', { cookieSelections: game.cookieSelections });
        }
    });

    socket.on('updateCookieShapes', ({ gameId, cookieShapes }) => {
        const game = games[gameId];
        if (game) {
            game.cookieShapes = cookieShapes;
            io.to(gameId).emit('cookieShapesUpdated', { cookieShapes: game.cookieShapes });
        }
    });

    // Pass TTS announcements directly to the countdown role
    socket.on('ttsAnnouncement', ({ gameId, message }) => {
        io.to(gameId).emit('ttsAnnouncement', { message });
    });

    // Pass MP3 playback requests directly to the countdown role
    socket.on('playMP3', ({ gameId, filename }) => {
        io.to(gameId).emit('playMP3', { filename });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 4501;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

