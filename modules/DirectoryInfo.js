import path from 'path';
import fs from 'fs';
import UniqueId from './UniqueId.js';
import MediaFile from './MediaFile.js';
import DataFileLoader from './DataFileLoader.js';

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
	 * @return {object} サブディレクトリIDをキー、サブディレクトリ名を値とするオブジェクト
	 */
	async getSubdirList() {
		const subdirNames = [];
		const subdirs = {};
		// 存在チェック
		for (const subdirId in this.data) {
			const subdirName = this.data[subdirId].name;
			if (fs.existsSync(path.join(this.dirPath, subdirName))) {
				subdirNames.push(subdirName);
				subdirs[subdirId] = subdirName;
			} else {
				// 存在しないものは除外
				delete this.data[subdirId];
			}
		}
		// 新規チェック
		const itemList = fs.readdirSync(this.dirPath);
		for (const item of itemList) {
			if (!fs.statSync(path.join(this.dirPath, item)).isDirectory()) continue;
			if (subdirNames.includes(item)) continue;
			const newId = UniqueId.get();
			this.data[newId] = {
				name: item,
				files: {}
			};
			subdirs[newId] = item;
		}
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
		const thumbUpdate = {};
		if (!this.data[subdirId]) return files;
		const subdirName = subdir.name;
		// 存在チェック
		for (const fileId in subdir.files) {
			const file = subdir.files[fileId];
			const fileName = file.n;
			const filePath = path.join(this.dirPath, subdirName, fileName);
			const stats = fs.statSync(filePath, { throwIfNoEntry: false });
			// ファイルに変更がない場合のみ既存扱い
			if (stats && stats.size == file.s && Math.floor(stats.mtimeMs / 1000) == file.m) {
				fileNames.push(fileName);
				files[fileId] = file;
			// 存在しないものと変更されたものは除外
			} else {
				delete subdir.files[fileId];
				thumbUpdate[fileId] = null;
			}
		}
		// 新規チェック
		const itemList = fs.readdirSync(path.join(this.dirPath, subdirName));
		const imageSizePromise = [];
		for (const item of itemList) {
			if (fileNames.includes(item)) continue;
			if (!/\.(jpe?g|jpe|png|gif|svg|webp)$/i.test(item)) continue;
			const filePath = path.join(this.dirPath, subdirName, item);
			const stats = fs.statSync(filePath);
			if (!stats.isFile()) continue;
			const fileId = UniqueId.get();
			imageSizePromise.push(new MediaFile(filePath).getSize({ fileId, filePath }));
			subdir.files[fileId] = {
				n: item,
				s: stats.size,
				m: Math.floor(stats.mtimeMs / 1000)
			};
			files[fileId] = subdir.files[fileId];
		}
		const imageSize = await Promise.all(imageSizePromise);
		for (const s of imageSize) {
			const { fileId, filePath, width: w, height: h } = s;
			const { width: tw, height: th } = this.thumb.getThumbnailSize(w, h);
			files[fileId] = Object.assign(files[fileId], { w, h, tw, th });
			thumbUpdate[fileId] = { fileId, filePath, width: tw, height: th };
		}
		this.thumb.update(thumbUpdate);
		this._save();
		return files;
	}

}
