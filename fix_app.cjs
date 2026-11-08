const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');
code = code.replace(/fetch\(\`\/api\/users\/me\/\$\{currentSession\.username\}\`\)/g, "fetch(`/api/users/me/${currentSession.uid || currentSession.username}`)");
fs.writeFileSync('App.tsx', code);
