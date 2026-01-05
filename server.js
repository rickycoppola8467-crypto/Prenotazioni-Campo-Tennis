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
  { email:'ricky.coppola8467@gmail.com', nome:'Riccardo', cognome:'Coppola', password:'admin', ruolo:'admin' }
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

  const startMinutes = timeToMinutes(ora); 
  const durationMinutes = parseInt(durata)*60; // 1 ora = 60 min, 2 ore = 120 min
  const endMinutes = startMinutes + durationMinutes;

  // Controllo orari apertura/chiusura
  if(startMinutes < 8*60 || endMinutes > 22*60)
    return res.json({ok:false,msg:'Orario fuori apertura'});

  // Controllo sovrapposizione
  const overlapping = bookings.some(b => 
    b.start === data && b.campo === campo &&
    !(endMinutes <= b.startMinutes || startMinutes >= b.endMinutes)
  );

  if(overlapping) return res.json({ok:false,msg:'Slot già occupato'});

  bookings.push({
    id: bookings.length+1,
    email,
    nome,
    cognome,
    campo,
    start: data,
    startMinutes,
    endMinutes
  });

  res.json({ok:true});
});

// ---------- CARICA SLOT ----------
app.post('/api/getSlots', (req,res) => {
  const { data, campo, durata } = req.body;
  const durationMinutes = parseFloat(durata) * 60;

  // Prenotazioni esistenti per quel giorno e campo
  const busy = bookings
    .filter(b => b.start === data && b.campo === campo)
    .map(b => ({
      startMinutes: b.startMinutes,
      endMinutes: b.endMinutes,
      userNome: b.nome + (b.cognome ? ' ' + b.cognome.slice(0,2) : '')
    }));

  // Tutti gli slot disponibili dalle 8:00 alle 22:00
  let allMinutes = [];
  for(let m = 8*60; m <= 22*60 - durationMinutes; m += 30){ 
    allMinutes.push(m);
  }

  // Filtra quelli liberi
  const free = allMinutes.filter(m => 
    !busy.some(b => !(m + durationMinutes <= b.startMinutes || m >= b.endMinutes))
  ).map(m => ({ start: minutesToTime(m) }));

  res.json({ free, busy });
});

// ---------- FUNZIONI UTILI ----------
function timeToMinutes(timeStr){
  const [h,m] = timeStr.split(':').map(Number);
  return h*60 + m;
}

function minutesToTime(mins){
  const h = Math.floor(mins/60);
  const m = mins % 60;
  return `${h}:${m===0?'00':m}`;
}

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
