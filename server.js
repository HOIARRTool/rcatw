const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/generate', async (req, res) => {
    const userPrompt = req.body.prompt;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("Error: API Key is missing");
        return res.status(500).json({ error: { message: "API Key not configured on server." } });
    }

    // --- FINAL CONFIGURATION ---
    // ใช้ v1beta คู่กับ gemini-1.5-flash (ชื่อมาตรฐาน ไม่เติม latest)
    // นี่คือรุ่นที่เสถียรที่สุดและฟรี
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini API Error:", JSON.stringify(data, null, 2));
            // ส่ง Error กลับไปบอกหน้าบ้านให้ชัดเจน
            throw new Error(data.error?.message || `API Error: ${data.error?.code}`);
        }

        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
             console.error("AI blocked response:", JSON.stringify(data, null, 2));
             throw new Error("AI refused to generate content (Safety or Empty).");
        }

        res.json(data);

    } catch (error) {
        console.error("Server Internal Error:", error);
        res.status(500).json({ error: { message: error.message } });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
