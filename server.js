import path from 'path';
import express from 'express';
import Config from './modules/Config.js';

const __dirname = import.meta.dirname;

const SERVER_PORT = 8052; // ウェブサーバーのポート番号

const config = new Config();
config.load();
console.log(config.data.settings);

const app = express();

app.use('/', (req, res, next) => {
	res.set('Cache-Control', 'no-cache');
	next();
});

app.get('/dirs', (req, res, next) => {
	// config.jsonを開く
	// directoriesキーをJSONで返す
	res.json({});
});

app.get('/dir/:dirId', (req, res, next) => {
	// config.jsonからdirPathを取得
	// dirPath/.rater.jsonを開き、filesをJSONで返す
	res.json({});
});

app.get('/thumb/:dirId/:subdirId/:fileId', (req, res, next) => {
	// config.jsonのthumbnailsを参照する
	// あれば画像データを返す
	// 無ければdirPath/.rater.jsonを参照してファイルを開きサムネイルを作成する
});

app.get('/file/:dirId/:fileName', (req, res, next) => {
	// config.jsonのdirPathとfileNameで直接ファイルを返す
});

app.get('/rename', (req, res, next) => {

});

app.get('/move', (req, res, next) => {

});

// index.htmlを返す
app.use('/', (req, res, next) => {
	if (req.path == '/') {
		next();
	} else {
		res.sendStatus(403);
	}
}, express.static(path.join(__dirname, './')));

// サーバーを起動
app.listen(SERVER_PORT);

console.log('server ok');
