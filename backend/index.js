
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

// Insert your RobloxSecurity cookie here (store in Vercel env)
const ROBLOSECURITY = process.env.ROBLOSECURITY;

async function getCSRFToken() {
    try {
        await axios.post('https://auth.roblox.com/v2/logout', {}, {
            headers: {
                'Cookie': `.ROBLOSECURITY=${ROBLOSECURITY}`
            }
        });
    } catch (error) {
        return error.response.headers['x-csrf-token'];
    }
}

// Get user ID from username
app.get('/api/userid/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const response = await axios.post(
            'https://users.roblox.com/v1/usernames/users',
            { usernames: [username], excludeBannedUsers: false }
        );

        const userId = response.data.data[0].id;
        res.json({ userId });
    } catch (err) {
        res.status(400).json({ error: "Cannot fetch user ID" });
    }
});

// Get owned gamepasses
app.get('/api/gamepasses/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const csrfToken = await getCSRFToken();

        const gamepassResponse = await axios.get(
            `https://inventory.roblox.com/v1/users/${userId}/assets/34?limit=100&sortOrder=Asc`,
            {
                headers: {
                    'Cookie': `.ROBLOSECURITY=${ROBLOSECURITY}`,
                    'X-CSRF-TOKEN': csrfToken
                }
            }
        );

        const items = gamepassResponse.data.data;

        const result = await Promise.all(items.map(async (item) => {
            // Get thumbnail
            const thumbRes = await axios.get(`https://thumbnails.roblox.com/v1/assets?assetIds=${item.assetId}&size=150x150&format=Png&type=Asset`);
            const imageUrl = thumbRes.data.data[0].imageUrl;

            // Get price
            let price = 0;
            try {
                const priceRes = await axios.get(`https://economy.roblox.com/v2/assets/${item.assetId}/details`);
                price = priceRes.data.price || 0;
            } catch {
                price = 0;
            }

            return {
                name: item.name,
                assetId: item.assetId,
                image: imageUrl,
                price
            };
        }));

        res.json(result);
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).json({ error: "Failed to fetch gamepasses" });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
