const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');

if (!code.includes('/api/auth/verify-membership')) {
    code = code.replace(/app\.post\('\/api\/membership\/verify-code',/g, 
`    app.post('/api/auth/verify-membership', (req, res) => {
        const { code } = req.body;
        // Basic code logic for the prompt
        if (code === 'VINZX-WEEK' || code === 'WEEKLY-1') {
            return res.json({ plan: 'WEEKLY' });
        }
        if (code === 'VINZX-BIWEEK' || code === 'BIWEEKLY-2') {
            return res.json({ plan: 'BIWEEKLY' });
        }
        if (code === 'VINZX-MONTH' || code === 'MONTHLY-3') {
            return res.json({ plan: 'MONTHLY' });
        }
        // Fallback for some generic codes
        if (code.includes('WEEKLY')) return res.json({ plan: 'WEEKLY' });
        if (code.includes('BIWEEKLY')) return res.json({ plan: 'BIWEEKLY' });
        if (code.includes('MONTHLY')) return res.json({ plan: 'MONTHLY' });
        
        return res.status(400).json({ error: 'Kode Tidak Valid atau Kadaluwarsa' });
    });

    app.post('/api/membership/verify-code',`);
    
    fs.writeFileSync('.core/backend/server.js', code);
    console.log('Added /api/auth/verify-membership');
} else {
    console.log('Endpoint already exists');
}
