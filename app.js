const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const admin = require('firebase-admin');
const path = require('path');

const app = express();
const port = 3000;

// Firebase setup
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://amf-games-default-rtdb.firebaseio.com'
});
const db = admin.database();

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Rota para extrair pontos de uma imagem
app.post('/extrair_pontos', upload.single('imagem'), (req, res) => {
  const imagemPath = req.file.path;

  const pythonProcess = spawn('python3', ['scripts/extrair_pontos.py', imagemPath]);

  pythonProcess.stdout.on('data', (data) => {
    const pontos = JSON.parse(data.toString());
    const fileName = path.basename(imagemPath);

    // Salvar pontos no Firebase Realtime Database
    const ref = db.ref('faces').push();
    ref.set({ fileName, pontos }, (error) => {
      if (error) {
        res.status(500).send(error.toString());
      } else {
        res.json({ id: ref.key, pontos });
      }
    });
  });

  pythonProcess.stderr.on('data', (data) => {
    res.status(500).send(data.toString());
  });
});

// Rota para comparar faces
app.post('/comparar_faces', upload.single('imagem'), async (req, res) => {
  const imagemPath = req.file.path;

  // Recuperar pontos salvos do Firebase
  const ref = db.ref('faces');
  ref.once('value', (snapshot) => {
    const facesData = snapshot.val();
    const pontosSalvos = facesData ? Object.values(facesData).map(face => face.pontos) : [];

    const pythonProcess = spawn('python3', ['scripts/comparar_pontos.py', imagemPath, JSON.stringify(pontosSalvos)]);

    pythonProcess.stdout.on('data', (data) => {
      const resultado = JSON.parse(data.toString());
      res.json(resultado);
    });

    pythonProcess.stderr.on('data', (data) => {
      res.status(500).send(data.toString());
    });
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
