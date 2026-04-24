import path from 'path';
import express from 'express';
import Config from './modules/Config.js';
import DirectoryInfo from './modules/DirectoryInfo.js';
import ThumbnailManager from './modules/ThumbnailManager.js';
import MediaFile from './modules/MediaFile.js';

const __dirname = import.meta.dirname;

const SERVER_PORT = 8052; // ウェブサーバーのポート番号

// 設定ファイルの読み込み
const config = new Config();
console.log(config.data.settings);
const thumb = new ThumbnailManager();

const app = express();

app.use(express.json());

app.use('/', (req, res, next) => {
	res.set('Cache-Control', 'no-cache');
	next();
});

// 登録済み親ディレクトリ一覧を返す
app.get('/dirs', (req, res, next) => {
	console.log('GET /dirs');
	res.json(config.data.directories);
});

// サブディレクトリ一覧・ファイル一覧を返す
app.get(['/dir/:dirId', '/dir/:dirId/:subdirId'], async (req, res, next) => {
	const { dirId, subdirId } = req.params;
	const { path: dirPath } = config.data.directories[dirId] || {};
	if (dirPath == null) {
		return res.json({ error: true });
	}
	const dirInfo = new DirectoryInfo(dirPath, thumb);
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

// サムネイル画像を返す
app.get('/thumb/:fileId', async (req, res, next) => {
	const { fileId } = req.params;
	const thumbName = await thumb.get(fileId);
	if (thumbName) {
		res.sendFile(thumbName, { root: thumb.THUMB_DIR }, (err) => {
			if (err) next(err);
		});
	} else {
		res.sendStatus(404);
	}
});

// 画像・動画ファイル本体を返す
app.get('/file/:dirId/:subdirName/:fileName', (req, res, next) => {
	const { dirId, subdirName, fileName } = req.params;
	const { path: dirPath } = config.data.directories[dirId] || {};
	if (dirPath == null) {
		return res.sendStatus(404);
	}
//	console.log(`GET /file/${dirId}/${subdirName}/${fileName}`);
	const relPath = path.join(subdirName, fileName);
	const file = new MediaFile(relPath, dirPath);
	// パスが不正な場合
	if (!file.filePath) {
		res.sendStatus(400);
	// 画像ファイルの場合
	} else if (file.isImage) {
		res.sendFile(relPath, { root: dirPath }, (err) => {
			if (err) next(err);
		});
	// 動画ファイルの場合
	} else if (file.isVideo) {
		const fileSize = file.fileSize;
		if (!fileSize) {
			// 存在しない場合
			return res.sendStatus(404);
		}
		const range = req.headers.range;
		// 範囲リクエストの場合
		if (range) {
			const parts = range.replace(/bytes=/, '').split('-');
			const start = parseInt(parts[0], 10);
			const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
			const chunkSize = end - start + 1;
			res.writeHead(206, {
				'Content-Range': `bytes ${start}-${end}/${fileSize}`,
				'Accept-Ranges': 'bytes',
				'Content-Length': chunkSize,
				'Content-Type': 'video/mp4'
			});
			file.createReadStream([start, end]).pipe(res);
		} else {
			res.writeHead(200, {
				'Content-Length': fileSize,
				'Content-Type': 'video/mp4'
			});
			file.createReadStream().pipe(res);
		}
	} else {
		// 画像・動画以外の場合
		res.sendStatus(403);
	}
});

// ファイル名・ディレクトリ名を変更する
app.post('/rename', (req, res, next) => {
	const { dirId, subdirId, fileId, newName } = req.body;
	const { path: dirPath } = config.data.directories[dirId] || {};
	const dirInfo = new DirectoryInfo(dirPath);
	try {
		if (fileId) {
			res.json(dirInfo.renameFile(subdirId, fileId, newName));
		} else {
			res.json(dirInfo.renameSubdir(subdirId, newName));
		}
	} catch (e) {
		res.json({ error: true, message: e.message });
	}
});

// ファイルを移動する
app.post('/move', (req, res, next) => {
	const { dirId, subdirId, fileIds, newSubdirId } = req.body;
	const { path: dirPath } = config.data.directories[dirId] || {};
	const dirInfo = new DirectoryInfo(dirPath);
	try {
		res.json(dirInfo.moveFile(subdirId, fileIds, newSubdirId));
	} catch (e) {
		res.json({ error: true, message: e.message });
	}
});

// レーティングを行なう
app.post('/rating', (req, res, next) => {
	const { dirId, subdirId, winnerFileId, loserFileId } = req.body;
	const { path: dirPath } = config.data.directories[dirId] || {};
	const dirInfo = new DirectoryInfo(dirPath);
	try {
		res.json(dirInfo.rating(subdirId, winnerFileId, loserFileId));
	} catch (e) {
		res.json({ error: true, message: e.message });
	}
});

// レーティングに関する操作を行なう
app.post('/ratingope', (req, res, next) => {
	const { dirId, subdirId, mode, params } = req.body;
	const { path: dirPath } = config.data.directories[dirId] || {};
	const dirInfo = new DirectoryInfo(dirPath);
	try {
		res.json(dirInfo.ratingOperation(subdirId, mode, params));
	} catch (e) {
		res.json({ error: true, message: e.message });
	}
})

// クリーンアップを行なう
app.post('/cleanup', async (req, res, next) => {
	const { dirId, subdirId, mode } = req.body;
	const { path: dirPath } = config.data.directories[dirId] || {};
	const dirInfo = new DirectoryInfo(dirPath, thumb);
	try {
		// 行方不明のディレクトリの削除
		if (mode == 'dir') {
			res.json(dirInfo.removeMissingDirectories());
		// サムネイルキャッシュの再構築
		} else if (mode == 'thumb') {
			res.json(await dirInfo.getFileList(subdirId, true));
		}
	} catch (e) {
		res.json({ error: true, message: e.message });
	}
});

// index.htmlを返す
app.use('/', (req, res, next) => {
//	if (req.path == '/') {
		next();
//	} else {
//		res.sendStatus(403);
//	}
}, express.static(path.join(__dirname, './static/')));

app.use('/', (err, req, res, next) => {
	if (res.headersSent) {
		res.destroy();
	} else {
		res.sendStatus(404);
	}
});

// サーバーを起動
app.listen(SERVER_PORT);

console.log('server ok');
