import path from 'path';
import express from 'express';
import Config from './modules/Config.js';
import DirectoryInfo from './modules/DirectoryInfo.js';

const __dirname = import.meta.dirname;

const SERVER_PORT = 8052; // ウェブサーバーのポート番号

// 設定ファイルの読み込み
const config = new Config();
config.load();
console.log(config.settings);

const app = express();

app.use('/', (req, res, next) => {
	res.set('Cache-Control', 'no-cache');
	next();
});

// 登録済み親ディレクトリ一覧を返す
app.get('/dirs', (req, res, next) => {
	console.log('GET /dirs');
	res.json(config.directories);
});

// サブディレクトリ一覧・ファイル一覧を返す
app.get(['/dir/:dirId', '/dir/:dirId/:subdirId'], async (req, res, next) => {
	const { dirId, subdirId } = req.params;
	const dirPath = config.directories[dirId];
	if (dirPath == null) {
		return res.json({ error: true });
	}
	const dirInfo = new DirectoryInfo(dirPath);
	// サブディレクトリ内のファイル一覧
	if (subdirId) {
		console.log(`GET /dir/${dirId}/${subdirId}`);
		res.json(await dirInfo.getFileList(subdirId));
	// 親ディレクトリ内のサブディレクトリ一覧
	} else {
		console.log(`GET /dir/${dirId}`);
		res.json(await dirInfo.getSubdirList());
	}
});

app.get('/thumb/:dirId/:subdirId/:fileId', (req, res, next) => {
	// config.jsonのthumbnailsを参照する
	// あれば画像データを返す
	// 無ければdirPath/.rater.jsonを参照してファイルを開きサムネイルを作成する
});

// 画像ファイル本体を返す
app.get('/file/:dirId/:subdirName/:fileName', (req, res, next) => {
	const { dirId, subdirName, fileName } = req.params;
	const dirPath = config.directories[dirId];
	if (dirPath == null) {
		return res.sendStatus(404);
	}
//	console.log(`GET /file/${dirId}/${subdirName}/${fileName}`);
	res.sendFile(fileName, { root: path.join(dirPath, subdirName) }, (err) => {
		if (err) res.sendStatus(404);
	});
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
