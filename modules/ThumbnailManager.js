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
		/**
		 * データファイルの中でサムネイル作成済みを表す値
		 * @type {number}
		 */
		this.THUMB_CREATED = 1;

		this._load('config/thumbnails.json');
	}

	/**
	 * サムネイルを取得する
	 * @param {string} fileId - ファイルID
	 * @return {string} サムネイル画像のファイル名
	 */
	async get(fileId) {
		if (this.data[fileId]) {
			// サムネイルの作成または更新が必要な場合
			if (this.data[fileId] !== this.THUMB_CREATED) {
				await this._create(fileId, this.data[fileId]);
				this.data[fileId] = this.THUMB_CREATED;
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
	 * サムネイル情報更新に必要なオブジェクトを作る
	 * @param {string} fileId - ファイルID
	 * @return {object} 以下の2つのメソッドを持つオブジェクト
	 * @property {function} create 作成を指示するオブジェクトを返す
	 * @property {function} delete 削除を指示するオブジェクトを返す
	 */
	getUpdateInfoGenerator(fileId) {
		const obj = {
			fileId: fileId,
			isDelete: false,
			isCreate: false
		};
		return {
			// 作成を指示するオブジェクトを返す
			create: ({ filePath, width, height }) => {
				obj.isCreate = true;
				return Object.assign(obj,
					{ filePath, width, height },
					// サムネイルサイズを計算
					this._getThumbnailSize(width, height)
				);
			},
			// 削除を指示するオブジェクトを返す
			delete: () => {
				obj.isDelete = true;
				return obj;
			}
		};
	}

	/**
	 * サムネイル情報を更新する
	 * @param {object} thumbUpdate - 更新する情報
	 */
	update(thumbUpdate) {
		for (const info of thumbUpdate) {
			const fileId = info.fileId;
			// 作成指示の場合
			if (info.isCreate) {
				const { filePath, thumbWidth, thumbHeight } = info;
				this.data[fileId] = { filePath, thumbWidth, thumbHeight };
			// 削除指示の場合
			} else if (info.isDelete) {
				delete this.data[fileId];
				this._delete(fileId);
			}
		}
		this._save();
	}

	/**
	 * サムネイル画像のサイズを計算する
	 * @param {number} width - 元画像の幅
	 * @param {number} height - 元画像の高さ
	 * @return {object} サムネイル画像のサイズ
	 * @property {number} thumbWidth サムネイル画像の幅
	 * @property {number} thumbHeight サムネイル画像の高さ
	 */
	_getThumbnailSize(width, height) {
		const ratio = height / width;
		if (height > width) {
			height = Math.min(this.BASE_SIZE * ratio, this.MAX_SIZE);
			width = height / ratio;
		} else {
			width = Math.min(this.BASE_SIZE / ratio, this.MAX_SIZE);
			height = width * ratio;
		}
		return {
			thumbWidth: Math.round(width),
			thumbHeight: Math.round(height)
		};
	}

	/**
	 * サムネイル画像を作成する
	 * @param {string} fileId - ファイルID
	 * @param {object} file - 画像の情報
	 * @param {string} file.filePath - ファイルパス
	 * @param {number} file.thumbWidth - サムネイルの幅
	 * @param {number} file.thumbHeight - サムネイルの高さ
	 */
	async _create(fileId, file) {
		const { filePath, thumbWidth, thumbHeight } = file;
		const media = new MediaFile(filePath);
		await media.createThumbnail(path.join(this.THUMB_DIR, `${fileId}.webp`), thumbWidth, thumbHeight);
	}

	/**
	 * サムネイル画像を削除する
	 * @param {string} fileId - ファイルID
	 */
	_delete(fileId) {
		fs.rmSync(path.join(this.THUMB_DIR, `${fileId}.webp`));
	}

}
