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
			if (stats && stats.isDirectory()) {
				subdirNames.push(subdir.name);
				subdirs[subdirId] = {
					name: subdir.name,
					numFiles: subdir.files ? Object.keys(subdir.files).length : null
				};
			} else {
				// 存在しないものは除外
				if (subdir.files) {
					for (const fileId in subdir.files) {
						thumbUpdate.push(this.thumb.getUpdateInfoGenerator(fileId).delete());
					}
				}
				delete this.data[subdirId];
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
		if (!subdir) return files;
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
			// 存在しないものと変更されたものは除外
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
			if (!/\.(jpe?g|jpe|png|gif|svg|webp)$/i.test(item)) continue;
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
				m: Math.floor(stats.mtimeMs / 1000)
			};
			files[fileId] = subdir.files[fileId];
		}
		// 新規画像の画像サイズを取得
		const imageSizes = await Promise.all(imageSizePromise);
		for (const { fileId, filePath, width, height } of imageSizes) {
			const info = this.thumb.getUpdateInfoGenerator(fileId).create({ filePath, width, height });
			thumbUpdate.push(info);
			Object.assign(subdir.files[fileId], {
				w: width,
				h: height,
				tw: info.thumbWidth,
				th: info.thumbHeight
			});
		}
		this.thumb.update(thumbUpdate);
		this._save();
		return files;
	}

}
