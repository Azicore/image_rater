import path from 'path';
import fs from 'fs';
import UniqueId from './UniqueId.js';
import MediaFile from './MediaFile.js';
import DataFileLoader from './DataFileLoader.js';
import RatingManager from './RatingManager.js';

/**
 * 親ディレクトリごとのデータファイルを操作するためのクラス
 */
export default class DirectoryInfo extends DataFileLoader {

	/**
	 * コンストラクタ
	 * @param {string} dirPath - 親ディレクトリのパス
	 * @param {ThumbnailManager} thumb - ThumbnailManagerオブジェクト
	 */
	constructor(dirPath, thumb) {
		super();
		/**
		 * 親ディレクトリのパス
		 * @type {string}
		 */
		this.dirPath = dirPath;
		/**
		 * ThumbnailManagerオブジェクト
		 * @type {ThumbnailManager}
		 */
		this.thumb = thumb;

		// データファイルの読み込み
		this._load(path.join(dirPath, '.imgrater.json'));
	}

	/**
	 * サブディレクトリの一覧を返す
	 * @return {object} サブディレクトリIDをキー、サブディレクトリ情報オブジェクトを値とするオブジェクト
	 */
	async getSubdirList() {
		const subdirNames = [];
		const subdirs = {};
		const thumbUpdate = [];
		// 存在チェック
		for (const subdirId in this.data) {
			const subdir = this.data[subdirId];
			const stats = fs.statSync(path.join(this.dirPath, subdir.name), { throwIfNoEntry: false });
			subdirNames.push(subdir.name);
			subdirs[subdirId] = {
				name: subdir.name,
				numFiles: subdir.files ? Object.keys(subdir.files).length : null
			};
			if (stats && stats.isDirectory()) {
				delete subdir.missing;
			} else {
				// 存在しない場合は行方不明フラグを立てる
				subdir.missing = true;
				subdirs[subdirId].missing = true;
			}
		}
		// 新規チェック
		let itemList = [];
		try {
			itemList = fs.readdirSync(this.dirPath);
		} catch (e) { }
		for (const item of itemList) {
			if (subdirNames.includes(item)) continue;
			if (!fs.statSync(path.join(this.dirPath, item)).isDirectory()) continue;
			const subdirId = UniqueId.get();
			this.data[subdirId] = {
				name: item,
				files: null // ※nullは未確認の意味
			};
			subdirs[subdirId] = {
				name: item,
				numFiles: null
			};
		}
		this.thumb.update(thumbUpdate);
		this._save();
		return subdirs;
	}

	/**
	 * サブディレクトリ内のファイルの一覧を返す
	 * @param {string} subdirId - サブディレクトリID
	 * @return {object} ファイルIDをキー、ファイル情報オブジェクトを値とするオブジェクト
	 */
	async getFileList(subdirId) {
		const fileNames = [];
		const files = {};
		const subdir = this.data[subdirId];
		if (!subdir || subdir.missing) return files;
		if (!subdir.files) subdir.files = {};
		const thumbUpdate = [];
		// 存在チェック
		for (const fileId in subdir.files) {
			const file = subdir.files[fileId];
			const fileName = file.n;
			const filePath = path.join(this.dirPath, subdir.name, fileName);
			const stats = fs.statSync(filePath, { throwIfNoEntry: false });
			// ファイルに変更がない場合のみ既存扱い
			if (stats && stats.isFile() && stats.size == file.s && Math.floor(stats.mtimeMs / 1000) == file.m) {
				fileNames.push(fileName);
				files[fileId] = file;
			// 存在しないものと変更されたものは除外 ●→変更するとレーティングが消えるが問題ないか？
			} else {
				delete subdir.files[fileId];
				thumbUpdate.push(this.thumb.getUpdateInfoGenerator(fileId).delete());
			}
		}
		// 新規チェック
		let itemList = [];
		try {
			itemList = fs.readdirSync(path.join(this.dirPath, subdir.name));
		} catch (e) { }
		const imageSizePromise = [];
		for (const item of itemList) {
			if (fileNames.includes(item)) continue;
			if (!/\.(jpg|jpeg?|png|gif|bmp|svg|webp|mp4)$/i.test(item)) continue;
			const filePath = path.join(this.dirPath, subdir.name, item);
			const stats = fs.statSync(filePath);
			if (!stats.isFile()) continue;
			const fileId = UniqueId.get();
			imageSizePromise.push((async () => {
				const { width, height } = await (new MediaFile(filePath).getSize());
				return { fileId, filePath, width, height };
			})());
			subdir.files[fileId] = {
				n: item,
				s: stats.size,
				m: Math.floor(stats.mtimeMs / 1000),
				r: RatingManager.INITIAL_RATING,
				g: RatingManager.INITIAL_WEIGHT
			};
		}
		// 新規画像の画像サイズを取得
		const imageSizes = await Promise.all(imageSizePromise);
		for (const { fileId, filePath, width, height } of imageSizes) {
			if (width == null || height == null) {
				delete subdir.files[fileId];
				continue;
			}
			const info = this.thumb.getUpdateInfoGenerator(fileId).create({ filePath, width, height });
			thumbUpdate.push(info);
			Object.assign(subdir.files[fileId], {
				w: width,
				h: height,
				tw: info.thumbWidth,
				th: info.thumbHeight
			});
			files[fileId] = subdir.files[fileId];
		}
		this.thumb.update(thumbUpdate);
		this._save();
		return files;
	}

	/**
	 * ファイル名を変更する
	 * @param {string} subdirId - サブディレクトリID
	 * @param {string} fileId - ファイルID
	 * @param {string} newName - 新しい名前
	 * @return {object} 成功時はオブジェクトを返す
	 */
	renameFile(subdirId, fileId, newName) {
		const subdir = this.data[subdirId];
		if (!subdir || !subdir.files) throw new Error('不明なディレクトリが指定されています。');
		const file = subdir.files[fileId];
		if (!file) throw new Error('不明なファイルが指定されています。');
		if (newName === '') throw new Error('新しいファイル名を入力して下さい。');
		if (/[\x00-\x1F\/:\\\x7F]/.test(newName)) throw new Error('ファイル名に使用できない文字が含まれています。');
		if (file.n == newName) throw new Error('変更後の名前が元の名前と同じです。');
		const oldPath = path.join(this.dirPath, subdir.name, file.n);
		const newPath = path.join(this.dirPath, subdir.name, newName);
		if (!fs.existsSync(oldPath)) throw new Error('ファイルが見つかりません。');
		if (fs.existsSync(newPath)) throw new Error('同じ名前のファイルがすでに存在します。');
		try {
			fs.renameSync(oldPath, newPath);
			file.n = newName;
			this._save();
			return { ok: true, oldPath, newPath };
		} catch (e) {
			console.log(`Error: DirectoryInfo#renameFile: ${e.message}`);
			throw new Error('ファイル操作中に不明なエラーが発生しました。');
		}
	}

	/**
	 * ファイルを別のサブディレクトリへ移動する
	 * @param {string} subdirId - サブディレクトリID
	 * @param {string[]} fileIds - 移動するファイルのファイルID
	 * @param {string} newSubdirId - 移動先のサブディレクトリID
	 * @return {object} 成功時はオブジェクトを返す
	 */
	moveFile(subdirId, fileIds, newSubdirId) {
		const subdir = this.data[subdirId];
		const newSubdir = this.data[newSubdirId];
		if (!subdir || !subdir.files) throw new Error('不明なディレクトリが指定されています。');
		if (subdirId == newSubdirId) throw new Error('移動先が同じディレクトリです。');
		if (!newSubdir) throw new Error('不明なディレクトリが指定されています。');
		if (!newSubdir.files) {
			newSubdir.files = {};
		}
		const newSubdirPath = path.join(this.dirPath, newSubdir.name);
		if (!fs.existsSync(newSubdirPath)) throw new Error('移動先のディレクトリが見つかりません。');
		const movedFileIds = [];
		for (const fileId of fileIds) {
			const file = subdir.files[fileId];
			if (!file) {
				if (fileIds.length > 1) continue;
				throw new Error('不明なファイルが指定されています。');
			}
			const oldPath = path.join(this.dirPath, subdir.name, file.n);
			const newPath = path.join(this.dirPath, newSubdir.name, file.n);
			if (!fs.existsSync(oldPath)) {
				if (fileIds.length > 1) continue;
				throw new Error('ファイルが見つかりません。');
			}
			if (fs.existsSync(newPath)) {
				if (fileIds.length > 1) continue;
				throw new Error('同じ名前のファイルがすでに存在します。');
			}
			try {
				fs.renameSync(oldPath, newPath);
			} catch (e) {
				console.log(`Error: DirectoryInfo#moveFile: ${e.message}`);
				if (fileIds.length > 1) continue;
				throw new Error('ファイル操作中に不明なエラーが発生しました。');
			}
			newSubdir.files[fileId] = file;
			delete subdir.files[fileId];
			movedFileIds.push(fileId);
		}
		this._save();
		const msg = movedFileIds.length == fileIds.length ? null : '移動できなかったファイルがあります。';
		return { ok: true, moved: movedFileIds, message: msg };
	}

	/**
	 * サブディレクトリ名を変更する
	 * @param {string} subdirId - サブディレクトリID
	 * @param {string} newName - 新しい名前
	 * @return {object} 成功時はオブジェクトを返す
	 */
	renameSubdir(subdirId, newName) {
		const subdir = this.data[subdirId];
		if (!subdir) throw new Error('不明なディレクトリが指定されています。');
		if (newName === '') throw new Error('新しいディレクトリ名を入力して下さい。');
		if (/[\x00-\x1F\/:\\\x7F]/.test(newName)) throw new Error('ディレクトリ名に使用できない文字が含まれています。');
		if (subdir.name == newName) throw new Error('変更後の名前が元の名前と同じです。');
		const oldPath = path.join(this.dirPath, subdir.name);
		const newPath = path.join(this.dirPath, newName);
		if (!fs.existsSync(oldPath)) throw new Error('ディレクトリが見つかりません。');
		if (fs.existsSync(newPath)) throw new Error('同じ名前のディレクトリがすでに存在します。');
		try {
			fs.renameSync(oldPath, newPath);
			subdir.name = newName;
			this._save();
			return { ok: true, oldPath, newPath };
		} catch (e) {
			throw new Error('ディレクトリ操作中に不明なエラーが発生しました。');
		}
	}

	/**
	 * レーティングを行なう
	 * @param {string} subdirId - サブディレクトリID
	 * @param {string} winnerFileId - 勝利したファイルのファイルID
	 * @param {string} loserFileId - 敗北したファイルのファイルID
	 * @return {object} 成功時はオブジェクトを返す
	 */
	rating(subdirId, winnerFileId, loserFileId) {
		const subdir = this.data[subdirId];
		if (!subdir) throw new Error('不明なディレクトリが指定されています。');
		if (!subdir.files) throw new Error('ファイルの情報がありません。');
		const rating = new RatingManager(subdir.files);
		if (winnerFileId && loserFileId) {
			rating.update(winnerFileId, loserFileId);
			this._save();
		}
		return { ok: true, next: rating.getNext() };
	}

	/**
	 * レーティングに関する操作を行なう
	 * @param {string} subdirId - サブディレクトリID
	 * @param {string} mode - 操作の種類（reset、exchange、adjustのいずれか）
	 * @param {object} [params] - 操作ごとのパラメータ
	 * @return {object} 成功時はオブジェクトを返す
	 */
	ratingOperation(subdirId, mode, params) {
		const subdir = this.data[subdirId];
		if (!subdir) throw new Error('不明なディレクトリが指定されています。');
		if (!subdir.files) throw new Error('ファイルの情報がありません。');
		const rating = new RatingManager(subdir.files);
		if (mode == 'reset') {
			rating.reset(params.fileIds, params.weightOnly);
		} else if (mode == 'exchange') {
			rating.exchange(params.fileIds[0], params.fileIds[1]);
		} else if (mode == 'adjust') {
			rating.adjust();
		}
		this._save();
		return { ok: true };
	}

	/**
	 * 行方不明のディレクトリを全て削除する
	 * @return {object} 成功時はオブジェクトを返す
	 */
	removeMissingDirectories() {
		const thumbUpdate = [];
		for (const subdirId in this.data) {
			const subdir = this.data[subdirId];
			if (!subdir.missing) continue;
			if (subdir.files) {
				for (const fileId in subdir.files) {
					thumbUpdate.push(this.thumb.getUpdateInfoGenerator(fileId).delete());
				}
			}
			delete this.data[subdirId];
		}
		this.thumb.update(thumbUpdate);
		this._save();
		return { ok: true };
	}

}
