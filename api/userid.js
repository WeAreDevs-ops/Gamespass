const axios = require('axios');

module.exports = async function (req, res) {
    if (req.method !== 'GET') return res.status(405).end();

    const { username } = req.query;

    try {
        const response = await axios.post(
            'https://users.roblox.com/v1/usernames/users',
            { usernames: [username], excludeBannedUsers: false }
        );

        if (response.data.data.length === 0) {
            return res.status(404).json({ error: "Username not found" });
        }

        const userId = response.data.data[0].id;
        res.json({ userId });
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).json({ error: "Failed to fetch user ID" });
    }
};
