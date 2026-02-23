import sharp from 'sharp';

/**
 * 画像ファイル・動画ファイルを扱うクラス
 */
export default class MediaFile {

	/**
	 * コンストラクタ
	 * @param {string} filePath - ファイルパス
	 * @param {object} info - getSize()の戻り値に含める値
	 */
	constructor(filePath, info) {
		/**
		 * ファイルパス
		 * @type {string}
		 */
		this.filePath = filePath;
		/**
		 * getSize()の戻り値に含める値
		 * @type {object}
		 */
		this.info = info || {};
	}

	get isImage() {
		return /\.(?:jpe?g|jpe|png|gif|webp)$/i.test(this.filePath);
	}

	get isVideo() {
		return /\.(?:mp4|mpg)$/i.test(this.filePath);
	}

	/**
	 * 画像のサイズを返す
	 * @return {object} width・heightを持つオブジェクト
	 */
	async getSize() {
		if (!this._metadata) {
			this._metadata = await sharp(this.filePath).metadata();
		}
		return Object.assign({}, this.info, this._metadata);
	}

	async createThumb() {
		const { width, height } = await this.getSize();
	}

}
