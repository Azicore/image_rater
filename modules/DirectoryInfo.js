import path from 'path';
import fs from 'fs';
import UniqueId from './UniqueId.js';

/**
 * 親ディレクトリごとのデータファイルを操作するためのクラス
 */
export default class DirectoryInfo {

	/**
	 * コンストラクタ
	 * @param {string} dirPath - 親ディレクトリのパス
	 */
	constructor(dirPath) {
		/**
		 * 親ディレクトリのパス
		 * @type {string}
		 */
		this.dirPath = dirPath;
		/**
		 * データファイルのパス
		 * @type {string}
		 */
		this.DATA_FILE = path.join(dirPath, '.imgrater.json');

		this._load();
	}

	/**
	 * データファイルを読み込む
	 */
	_load() {
		/**
		 * データファイルの内容
		 * @type {object}
		 */
		this.data = {};
		try {
			this.data = JSON.parse(fs.readFileSync(this.DATA_FILE));
		} catch (e) { }
	}

	/**
	 * データファイルを保存する
	 */
	_save() {
		fs.writeFileSync(this.DATA_FILE, JSON.stringify(this.data));
	}

	/**
	 * サブディレクトリの一覧を返す
	 * @return {object} サブディレクトリIDをキー、サブディレクトリ名を値とするオブジェクト
	 */
	getSubdirList() {
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
	getFileList(subdirId) {
		const fileNames = [];
		const files = {};
		const subdir = this.data[subdirId];
		if (!this.data[subdirId]) return files;
		const subdirName = subdir.name;
		// 存在チェック
		for (const fileId in subdir.files) {
			const file = subdir.files[fileId];
			const fileName = file.name;
			if (fs.existsSync(path.join(this.dirPath, subdirName, fileName))) {
				fileNames.push(fileName);
				files[fileId] = file;
			} else {
				// 存在しないものは除外
				delete subdir.files[fileId];
			}
		}
		// 新規チェック
		const itemList = fs.readdirSync(path.join(this.dirPath, subdirName));
		for (const item of itemList) {
			const stats = fs.statSync(path.join(this.dirPath, subdirName, item));
			if (!stats.isFile()) continue;
			if (fileNames.includes(item)) continue;
			if (!/\.(jpe?g|jpe|png|gif|svg|webp)$/i.test(item)) continue;
			const newId = UniqueId.get();
			subdir.files[newId] = {
				name: item,
				size: stats.size,
				modified: stats.mtime
			};
			files[newId] = subdir.files[newId];
		}
		this._save();
		return files;
	}

}
