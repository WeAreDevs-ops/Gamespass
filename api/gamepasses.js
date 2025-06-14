const axios = require('axios');

module.exports = async function (req, res) {
    if (req.method !== 'GET') return res.status(405).end();

    const { userId } = req.query;
    const ROBLOSECURITY = process.env.ROBLOSECURITY;

    if (!ROBLOSECURITY) {
        return res.status(500).json({ error: 'ROBLOSECURITY is not set.' });
    }

    try {
        // CSRF token
        const csrfRes = await axios.post('https://auth.roblox.com/v2/logout', {}, {
            headers: { Cookie: `.ROBLOSECURITY=${ROBLOSECURITY}` }
        }).catch(err => err.response);

        const csrfToken = csrfRes.headers['x-csrf-token'];

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
            const thumbRes = await axios.get(`https://thumbnails.roblox.com/v1/assets?assetIds=${item.assetId}&size=150x150&format=Png&type=Asset`);
            const imageUrl = thumbRes.data.data[0].imageUrl;

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
};
