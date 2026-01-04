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
  const { email, nome, campo, data, ora, durata } = req.body;
  bookings.push({ 
    id:bookings.length+1, email, nome, campo, start:data, startHour:ora, durata, end:calcEnd(ora,durata)
  });
  res.json({ok:true});
});

// ---------------- CARICA SLOT ----------------
app.post('/api/getSlots', (req,res)=>{
  const { data, campo, durata } = req.body;
  const busy = bookings.filter(b=>b.start===data && b.campo===campo)
                       .map(b=>({start:b.start, end:b.end, user:b.nome}));
  
  // esempio: slot libero ogni ora dalle 8 alle 20
  const allHours = Array.from({length:13},(_,i)=>8+i);
  const free = allHours
               .filter(h=>!busy.some(b=>h>=parseInt(b.startHour)&&h<parseInt(b.end)))
               .map(h=>({ora:h}));
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
