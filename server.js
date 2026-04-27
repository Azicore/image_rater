import path from 'path';
import express from 'express';
import DirectoryInfo from './modules/DirectoryInfo.js';
import ThumbnailManager from './modules/ThumbnailManager.js';
import MediaFile from './modules/MediaFile.js';
import { config } from './config.js';

const __dirname = import.meta.dirname;

if (!config) {
	console.error(`Invalid config: ${process.env.NODE_ENV}`);
	process.exit(1);
}

const thumb = new ThumbnailManager();

const app = express();
const router = express.Router();

router.use(express.json());

router.use('/', (req, res, next) => {
	res.set('Cache-Control', 'no-cache');
	next();
});

// 登録済み親ディレクトリ一覧を返す
router.get('/dirs', (req, res, next) => {
	console.log('GET /dirs');
	res.json(config.directories);
});

// サブディレクトリ一覧・ファイル一覧を返す
router.get(['/dir/:dirId', '/dir/:dirId/:subdirId'], async (req, res, next) => {
	const { dirId, subdirId } = req.params;
	const { path: dirPath } = config.directories[dirId] || {};
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
router.get('/thumb/:fileId', async (req, res, next) => {
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
router.get('/file/:dirId/:subdirName/:fileName', (req, res, next) => {
	const { dirId, subdirName, fileName } = req.params;
	const { path: dirPath } = config.directories[dirId] || {};
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
router.post('/rename', (req, res, next) => {
	const { dirId, subdirId, fileId, newName } = req.body;
	const { path: dirPath } = config.directories[dirId] || {};
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
router.post('/move', (req, res, next) => {
	const { dirId, subdirId, fileIds, newSubdirId } = req.body;
	const { path: dirPath } = config.directories[dirId] || {};
	const dirInfo = new DirectoryInfo(dirPath);
	try {
		res.json(dirInfo.moveFile(subdirId, fileIds, newSubdirId));
	} catch (e) {
		res.json({ error: true, message: e.message });
	}
});

// レーティングを行なう
router.post('/rating', (req, res, next) => {
	const { dirId, subdirId, winnerFileId, loserFileId } = req.body;
	const { path: dirPath } = config.directories[dirId] || {};
	const dirInfo = new DirectoryInfo(dirPath);
	try {
		res.json(dirInfo.rating(subdirId, winnerFileId, loserFileId));
	} catch (e) {
		res.json({ error: true, message: e.message });
	}
});

// レーティングに関する操作を行なう
router.post('/ratingope', (req, res, next) => {
	const { dirId, subdirId, mode, params } = req.body;
	const { path: dirPath } = config.directories[dirId] || {};
	const dirInfo = new DirectoryInfo(dirPath);
	try {
		res.json(dirInfo.ratingOperation(subdirId, mode, params));
	} catch (e) {
		res.json({ error: true, message: e.message });
	}
})

// クリーンアップを行なう
router.post('/cleanup', async (req, res, next) => {
	const { dirId, subdirId, mode } = req.body;
	const { path: dirPath } = config.directories[dirId] || {};
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
router.use('/', (req, res, next) => {
//	if (req.path == '/') {
		next();
//	} else {
//		res.sendStatus(403);
//	}
}, express.static(path.join(__dirname, './static/')));

router.use('/', (err, req, res, next) => {
	if (res.headersSent) {
		res.destroy();
	} else {
		res.sendStatus(404);
	}
});

// サーバーを起動
app.use(config.prefix, router);
app.listen(config.port);

console.log('server ok');
