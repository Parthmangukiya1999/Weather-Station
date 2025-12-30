// const { SerialPort } = require('serialport');
// const { ReadlineParser } = require('@serialport/parser-readline');
// const sqlite3 = require('sqlite3').verbose();
// const path = require('path');
// const uploadToThingSpeak = require('./thingspeak');

// const db = new sqlite3.Database(path.join(__dirname, 'weather_data.db'));

// db.run(`
//   CREATE TABLE IF NOT EXISTS weather_logs (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
//     temperature REAL,
//     humidity REAL,
//     noise REAL
//   )
// `);

// const port = new SerialPort({
//   path: 'COM4', 
//   baudRate: 9600,
// });

// const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// parser.on('data', async (line) => {
//   try {
//     console.log('[Serial]', line);

//     const parts = line.trim().split(',');
//     const temp = parseFloat(parts[0]);
//     const hum = parseFloat(parts[1]);
//     const noise = parseFloat(parts[2]);

//     if (isNaN(temp) || isNaN(hum) || isNaN(noise)) return;

//     db.run(
//       `INSERT INTO weather_logs (temperature, humidity, noise) VALUES (?, ?, ?)`,
//       [temp, hum, noise]
//     );

//     await uploadToThingSpeak(temp, hum, noise);
//     console.log('Uploaded to ThingSpeak');
//   } catch (err) {
//     console.error(' Error:', err);
//   }
// });
