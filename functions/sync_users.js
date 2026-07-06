const admin = require('firebase-admin');
const fs = require('fs');

// Precisa usar as credenciais corretas ou rodar no ambiente do firebase functions
// Como estamos no terminal do usuário, e ele tem a CLI autenticada, podemos tentar usar o admin.initializeApp() padrão
// Se falhar, podemos inicializar com applicationDefault()

process.env.FIRESTORE_EMULATOR_HOST = ""; // Garantir que não está no emulador

try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: "doghotel-eca69"
  });
} catch (e) {
  // Se falhar, tenta com default
  console.log("Tentando init default");
  admin.initializeApp();
}

const db = admin.firestore();
const appId = "doghotel-production";

async function syncUsers() {
  const data = JSON.parse(fs.readFileSync('../users.json', 'utf8'));
  const users = data.users;
  
  console.log(`Encontrados ${users.length} usuários.`);
  
  const batch = db.batch();
  let count = 0;
  
  for (const user of users) {
    if (!user.email) continue;
    
    const role = user.email.toLowerCase() === 'lyoni.berbert@gmail.com' ? 'admin' : 'user';
    
    const docRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('user_roles').doc(user.localId);
    batch.set(docRef, {
      email: user.email.toLowerCase(),
      name: user.displayName || user.email.split('@')[0],
      role: role,
      createdAt: user.createdAt ? new Date(parseInt(user.createdAt)).toISOString() : new Date().toISOString()
    }, { merge: true });
    
    count++;
    
    if (count % 400 === 0) {
      await batch.commit();
      console.log(`Commit de ${count} usuários...`);
    }
  }
  
  if (count % 400 !== 0) {
    await batch.commit();
  }
  
  console.log(`Sincronização concluída: ${count} usuários salvos em user_roles.`);
}

syncUsers().catch(console.error);
