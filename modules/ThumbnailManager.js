import path from 'path';
import fs from 'fs';
import DataFileLoader from './DataFileLoader.js';
import MediaFile from './MediaFile.js';

/**
 * サムネイル管理のためのクラス
 */
export default class ThumbnailManager extends DataFileLoader {

	/**
	 * コンストラクタ
	 */
	constructor() {
		super();
		/**
		 * サムネイルを保管するディレクトリ
		 * @type {string}
		 */
		this.THUMB_DIR = 'thumbnails';
		/**
		 * サムネイルの基本サイズ
		 * @type {number}
		 */
		this.BASE_SIZE = 200;
		/**
		 * サムネイルの最大サイズ
		 * @type {number}
		 */
		this.MAX_SIZE = 360;

		this._load('config/thumbnails.json');
	}

	/**
	 * サムネイルの取得
	 * @param {string} fileId - ファイルID
	 * @return {string} サムネイル画像のファイル名
	 */
	async get(fileId) {
		if (this.data[fileId]) {
			// サムネイルの作成または更新が必要な場合
			if (this.data[fileId] !== true) {
				await this._create(this.data[fileId]);
				// 作成したら値をtrueにする
				this.data[fileId] = true;
				this._save();
			}
			// サムネイルのファイル名を返す
			return `${fileId}.webp`;
		} else {
			// サムネイルが存在しない場合はnullを返す
			return null;
		}
	}

	/**
	 * サムネイル情報の更新
	 * @param {object} thumbUpdate - 更新する情報
	 */
	update(thumbUpdate) {
		for (const fileId in thumbUpdate) {
			const file = thumbUpdate[fileId]; // object or true or null
			if (file) {
				// 値がtrueかファイル情報の場合は更新する
				this.data[fileId] = file;
			} else {
				// 値がnullの場合は削除する
				delete this.data[fileId];
				this._delete(fileId);
			}
		}
		this._save();
	}

	/**
	 * サムネイル画像のサイズを取得する
	 * @param {number} width - 元画像の幅
	 * @param {number} height - 元画像の高さ
	 * @return {object} サムネイル画像のサイズ
	 * @property {number} width サムネイル画像の幅
	 * @property {number} height サムネイル画像の高さ
	 */
	getThumbnailSize(width, height) {
		const ratio = height / width;
		if (height > width) {
			height = Math.min(this.BASE_SIZE * ratio, this.MAX_SIZE);
			width = height / ratio;
		} else {
			width = Math.min(this.BASE_SIZE / ratio, this.MAX_SIZE);
			height = width * ratio;
		}
		return {
			width: Math.round(width),
			height: Math.round(height)
		};
	}

	/**
	 * サムネイル画像を作成する
	 * @param {object} file - 画像の情報
	 * @param {string} file.fileId - ファイルID
	 * @param {string} file.filePath - ファイルパス
	 * @param {number} file.width - サムネイルの幅
	 * @param {number} file.height - サムネイルの高さ
	 */
	async _create(file) {
		const { fileId, filePath, width, height } = file;
		const media = new MediaFile(filePath);
		await media.createThumbnail(path.join(this.THUMB_DIR, `${fileId}.webp`), width, height);
	}

	/**
	 * サムネイル画像を削除する
	 * @param {string} fileId - ファイルID
	 */
	_delete(fileId) {
		fs.rmSync(path.join(this.THUMB_DIR, `${fileId}.webp`));
	}

}
