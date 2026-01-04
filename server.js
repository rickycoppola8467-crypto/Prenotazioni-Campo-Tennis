// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // serve index.html e file statici
app.get("/", (req, res) => {res.sendFile(__dirname + "/public/login.html");});
app.get("/login", (req, res) => {res.sendFile(__dirname + "/public/login.html");});
app.get("/app", (req, res) => {res.sendFile(__dirname + "/public/app.html");});

// ---------------- DATABASE SIMULATO ----------------
let users = [
  { email:'ricky.coppola8467@gmail.com', nome:'Admin', cognome:'Admin', password:'admin', ruolo:'admin' }
];
let bookings = [];

// ---------------- REGISTRAZIONE ----------------
app.post('/api/register', (req, res) => {
  const { email, nome, cognome, password, passwordConfirm } = req.body;
  if (!email || !nome || !cognome || !password)
    return res.json({ ok:false, msg:'Compila tutti i campi' });
  if (password !== passwordConfirm)
    return res.json({ ok:false, msg:'Password non corrispondono' });
  if (users.find(u=>u.email===email))
    return res.json({ ok:false, msg:'Email già registrata' });

  users.push({ email, nome, cognome, password, ruolo:'utente' });
  res.json({ ok:true, msg:'Registrazione avvenuta con successo', nome });
});

// ---------------- LOGIN ----------------
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email===email && u.password===password);
  if (!user) return res.json({ ok:false, msg:'Email o password errate' });

  res.json({ ok:true, nome:user.nome, ruolo:user.ruolo });
});

// ---------------- RESET PASSWORD ----------------
app.post('/api/resetPassword', (req,res)=>{
  const { email, newPassword, confirmPassword } = req.body;
  if(newPassword !== confirmPassword) return res.json({ok:false,msg:'Password non corrispondono'});
  const user = users.find(u=>u.email===email);
  if(!user) return res.json({ok:false,msg:'Email non trovata'});
  user.password = newPassword;
  res.json({ok:true,msg:'Password aggiornata con successo'});
});

// ---------------- PRENOTAZIONI ----------------
app.post('/api/book', (req,res)=>{
  const { email, nome, cognome, campo, data, ora, durata } = req.body;
  const startHour = parseFloat(ora.replace(':','.')); // es. 14:30 -> 14.5
  const endHour = startHour + parseFloat(durata);

  // Controllo sovrapposizione
  const overlapping = bookings.some(b => 
    b.start === data && b.campo === campo &&
    (startHour < parseFloat(b.end) && endHour > parseFloat(b.startHour))
  );
  if(overlapping) return res.json({ok:false,msg:'Slot già occupato'});

  bookings.push({
    id: bookings.length+1,
    email,
    nome,
    cognome,
    campo,
    start: data,
    startHour: startHour.toString(),
    end: endHour.toString()
  });

  res.json({ok:true});
});

// ---------------- CARICA SLOT ----------------
app.post('/api/getSlots', (req,res) => {
  const { data, campo, durata } = req.body;

  // Prenotazioni esistenti per quel giorno e campo
  const busy = bookings
    .filter(b => b.start === data && b.campo === campo)
    .map(b => ({
      start: parseFloat(b.startHour), 
      end: parseFloat(b.end), 
      userNome: b.nome + (b.cognome ? ' ' + b.cognome[0] + '.' : '')
    }));

  // Tutti gli orari disponibili dalle 8:00 alle 22:00
  let allHours = [];
  for(let h=8; h<=22-durata; h+=0.5) { // incrementi di 30 minuti
    allHours.push(h);
  }

  // Filtra quelli liberi
  const free = allHours.filter(h => {
    return !busy.some(b => (h < b.end && h + durata > b.start)); 
    // Controlla sovrapposizione
  }).map(h => {
    const hour = Math.floor(h);
    const min = h % 1 === 0 ? '00' : '30';
    return { start: `${hour}:${min}` };
  });

  res.json({ free, busy });
});

// ---------------- STORICO PRENOTAZIONI ----------------
app.get('/api/myBookings/:email', (req,res)=>{
  const email = req.params.email;
  const myB = bookings.filter(b=>b.email===email);
  res.json(myB);
});

// ---------------- DELETE PRENOTAZIONE ----------------
app.post('/api/deleteBooking', (req,res)=>{
  const { id } = req.body;
  const index = bookings.findIndex(b=>b.id===id);
  if(index===-1) return res.json({ok:false,msg:'Prenotazione non trovata'});
  bookings.splice(index,1);
  res.json({ok:true});
});

// ---------------- CARICA TUTTI GLI UTENTI (ADMIN) ----------------
app.get('/api/allUsers', (req,res)=>{
  res.json(users.map(u=>({email:u.email,nome:u.nome})));
});

// ---------------- FUNZIONI UTILI ----------------
function calcEnd(start,durata){
  const endHour = parseInt(start)+parseInt(durata);
  return endHour.toString();
}

// ---------------- AVVIO SERVER ----------------
app.listen(port, ()=>console.log(`Server attivo su http://localhost:${port}`));
