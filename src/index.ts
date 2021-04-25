export {};
const express = require('express');
import {MuseumService} from './MuseumService';

const app = express();

const port = 3000;
const ip = 'localhost';
let museumService = new MuseumService();

app.get('/', async (req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(await museumService.getImages());
});

const server = app.listen(port, ip, async function () {
    console.log('Server listening on port ' + port);
});

