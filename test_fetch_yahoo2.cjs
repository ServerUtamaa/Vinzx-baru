fetch('http://localhost:3000/api/yahoo?symbol=EURUSD=X&interval=1m&range=1d').then(r => r.json()).then(console.log).catch(console.error);
