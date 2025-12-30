// const { SerialPort } = require('serialport');
// const { ReadlineParser } = require('@serialport/parser-readline');
// const axios = require('axios');

// const SERIAL_PORT = 'COM4';

// const THINGSPEAK_API_KEY = 'QLJL3BSK6B0GA55U';

// const port = new SerialPort({
//   path: SERIAL_PORT,
//   baudRate: 115200,
// });

// const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// parser.on('data', async (line) => {
//   try {
//     const data = JSON.parse(line.trim());

//     const temperature = data.temperature;
//     const humidity = data.humidity;

//     if (temperature && humidity) {
//       console.log('From Pico:', data);

//       const url = `https://api.thingspeak.com/update?api_key=${THINGSPEAK_API_KEY}&field1=${temperature}&field2=${humidity}`;
//       const res = await axios.get(url);

//       if (res.data === 0) {
//         console.error('Upload failed (rate limit or error)');
//       } else {
//         console.log(`Data uploaded (Entry #${res.data})`);
//       }
//     } else {
//       console.warn('Incomplete data:', data);
//     }
//   } catch (err) {
//     console.error(' Invalid JSON:', line);
//   }
// });
